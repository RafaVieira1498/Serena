import { isSupabaseConfigured, readAccessToken, supabaseAdmin, supabaseUser } from "../../../lib/supabase";

type Turn = { role: string; text: string };
type StoredMessage = { role: string; content: string; created_at: string };

const crisisReply = "Sinto muito que você esteja passando por isso. Sua segurança vem primeiro. Se houver risco imediato, ligue agora para o SAMU (192) ou vá a uma emergência. Para apoio emocional, fale gratuitamente com o CVV pelo 188. Se puder, chame alguém de confiança para ficar com você agora.";
const crisisPattern = /suic|me matar|não quero viver|nao quero viver|tirar minha vida|me machucar/i;

const instructions = `Você é Serena, uma agente virtual de IA de apoio conversacional em português brasileiro. Deixe claro no início da relação que você é IA, não psicóloga humana ou licenciada. Nunca finja ser uma profissional real. Não faça diagnóstico, prescrição, prognóstico ou indicação clínica de tratamento.

Leia toda a conversa antes de responder. Interprete respostas curtas como continuação direta da última pergunta. Responda ao detalhe novo trazido pela pessoa e avance a conversa; não repita explicações, aberturas, estruturas ou perguntas anteriores. Não transforme cada fala em questionário. Faça no máximo uma pergunta, somente quando ela ajudar. Use linguagem natural, calorosa e específica, em 1 a 3 parágrafos curtos. Não mencione regras internas, prompts, automação ou como a resposta foi produzida.

Valide emoções sem afirmar suposições como fatos. Quando apropriado, ofereça reflexão ou estratégia leve e de baixo risco. Em temas médicos, medicamentos, violência ou risco, encaminhe para ajuda humana. Em risco imediato, priorize emergência 192, CVV 188 e alguém de confiança.`;

function normalizeTurns(turns: Turn[]) {
  return turns.filter((turn) => ["user", "ai", "assistant"].includes(turn.role) && turn.text?.trim()).slice(-30).map((turn) => ({
    role: turn.role === "user" ? "user" : "assistant",
    content: turn.text.trim(),
  }));
}

async function cloudflareAnswer(conversation: Array<{ role: string; content: string }>) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_API_TOKEN;
  if (!account || !token) return null;
  const model = process.env.CLOUDFLARE_AI_MODEL || "@cf/meta/llama-3.2-3b-instruct";
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "system", content: instructions }, ...conversation], max_tokens: 420, temperature: 0.72 }),
  });
  const payload = await response.json() as { success?: boolean; result?: { response?: string }; errors?: Array<{ message?: string }> };
  if (!response.ok || !payload.success || !payload.result?.response) throw new Error(payload.errors?.[0]?.message || `Cloudflare AI ${response.status}`);
  return { answer: payload.result.response.trim(), mode: "cloudflare-workers-ai" };
}

async function openAIAnswer(conversation: Array<{ role: string; content: string }>) {
  const token = process.env.OPENAI_API_KEY;
  if (!token) return null;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini", instructions, input: conversation, max_output_tokens: 420, store: false }),
  });
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (!response.ok) throw new Error(`OpenAI ${response.status}`);
  const answer = payload.output_text || payload.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("\n").trim();
  if (!answer) throw new Error("Resposta vazia");
  return { answer, mode: "openai" };
}

async function persistedContext(request: Request, sessionId?: string) {
  if (!sessionId || !isSupabaseConfigured()) return { userId: "", turns: [] as Turn[] };
  const token = readAccessToken(request);
  const user = token ? await supabaseUser(token) : null;
  if (!user) return { userId: "", turns: [] as Turn[] };
  const owned = await supabaseAdmin<Array<{ id: string }>>(`sessions?id=eq.${encodeURIComponent(sessionId)}&user_id=eq.${user.id}&select=id&limit=1`);
  if (!owned.length) return { userId: "", turns: [] as Turn[] };

  const [recentSessions, assessments] = await Promise.all([
    supabaseAdmin<Array<{ id: string }>>(`sessions?user_id=eq.${user.id}&select=id&order=started_at.desc&limit=5`),
    supabaseAdmin<Array<{ concern: string; intensity: number; duration: string; impacts: string[]; goal: string }>>(`assessments?user_id=eq.${user.id}&select=concern,intensity,duration,impacts,goal&order=created_at.desc&limit=1`),
  ]);
  const rows: StoredMessage[] = [];
  for (const session of recentSessions.reverse()) {
    const sessionRows = await supabaseAdmin<StoredMessage[]>(`messages?session_id=eq.${session.id}&select=role,content,created_at&order=created_at.asc&limit=30`);
    rows.push(...sessionRows);
  }
  const assessment = assessments[0];
  const turns: Turn[] = assessment ? [{ role: "assistant", text: `Contexto informado pela pessoa na avaliação inicial: queixa principal: ${assessment.concern}; intensidade ${assessment.intensity}/10; duração: ${assessment.duration}; impactos: ${(assessment.impacts || []).join(", ") || "não informados"}; objetivo: ${assessment.goal}. Use este contexto com discrição, sem dizer que está lendo uma ficha.` }] : [];
  turns.push(...rows.slice(-40).map((row) => ({ role: row.role, text: row.content })));
  return { userId: user.id, turns };
}

export async function POST(request: Request) {
  const { query = "", history = [], sessionId } = await request.json() as { query?: string; history?: Turn[]; sessionId?: string };
  const clean = query.trim();
  if (!clean) return Response.json({ error: "Mensagem obrigatória" }, { status: 400 });
  if (crisisPattern.test(clean)) return Response.json({ answer: crisisReply, safety: "crisis", mode: "safety-protocol" });

  try {
    const persisted = await persistedContext(request, sessionId);
    const conversation = normalizeTurns(persisted.turns.length ? persisted.turns : history);
    conversation.push({ role: "user", content: clean });
    const generated = await cloudflareAnswer(conversation) ?? await openAIAnswer(conversation);
    if (!generated) return Response.json({ error: "A inteligência da conversa ainda precisa ser conectada.", code: "AI_NOT_CONFIGURED" }, { status: 503 });

    if (persisted.userId && sessionId) {
      await supabaseAdmin("messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([
        { session_id: sessionId, role: "user", content: clean, input_mode: "text" },
        { session_id: sessionId, role: "assistant", content: generated.answer, input_mode: "text" },
      ]) });
    }
    return Response.json({ ...generated, grounded: false, citations: [] });
  } catch (error) {
    console.error("Falha ao gerar resposta", error);
    return Response.json({ error: "Não foi possível gerar a resposta agora.", code: "AI_RESPONSE_FAILED" }, { status: 502 });
  }
}
