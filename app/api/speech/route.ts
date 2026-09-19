export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ fallback: true }, { status: 503 });
  const { text } = await request.json() as { text?: string };
  if (!text?.trim()) return Response.json({ error: "Texto obrigatório" }, { status: 400 });
  const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "authorization": `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: text.slice(0, 5000),
      instructions: "Fale em português brasileiro como uma mulher adulta em uma conversa individual acolhedora. Use ritmo humano e espontâneo, variação natural de entonação, frases ligadas e pausas breves nos pontos de reflexão. Demonstre atenção e serenidade sem dramatizar. Não leia como locução, anúncio, audiolivro ou assistente digital. Evite cadência regular, ênfase excessiva e tom robótico.",
      response_format: "mp3",
    }),
  });
  if (!upstream.ok) return Response.json({ fallback: true }, { status: 502 });
  return new Response(upstream.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
}
