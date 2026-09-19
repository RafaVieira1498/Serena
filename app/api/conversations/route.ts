import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { messages, sessions } from "../../../db/schema";
import { isSupabaseConfigured, readAccessToken, supabaseAdmin, supabaseUser } from "../../../lib/supabase";

export async function GET(request: Request) {
  if (isSupabaseConfigured()) {
    const token = readAccessToken(request);
    const user = token ? await supabaseUser(token) : null;
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const rows = await supabaseAdmin(`sessions?user_id=eq.${user.id}&select=*&order=started_at.desc&limit=30`);
    return Response.json({ sessions: rows });
  }
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId is required" }, { status: 400 });
  const db = getDb();
  const rows = await db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.startedAt)).limit(30);
  return Response.json({ sessions: rows });
}

export async function POST(request: Request) {
  const body = await request.json() as { userId?: string; sessionId?: number|string; content?: string; inputMode?: "text"|"audio" };
  if (!body.sessionId || !body.content?.trim()) return Response.json({ error: "sessionId and content are required" }, { status: 400 });
  if (isSupabaseConfigured()) {
    const token = readAccessToken(request);
    const user = token ? await supabaseUser(token) : null;
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const cloudSessionId = String(body.sessionId);
    const owned = await supabaseAdmin<Array<{ id: string }>>(`sessions?id=eq.${encodeURIComponent(cloudSessionId)}&user_id=eq.${user.id}&select=id&limit=1`);
    if (!owned.length) return Response.json({ error: "Sessão não encontrada" }, { status: 404 });
    const crisis = /suic|me matar|não quero viver|machucar/i.test(body.content);
    const [saved] = await supabaseAdmin<Array<Record<string, unknown>>>("messages?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ session_id: cloudSessionId, role: "user", content: body.content.trim(), input_mode: body.inputMode ?? "text" }) });
    if (crisis) await supabaseAdmin(`sessions?id=eq.${encodeURIComponent(cloudSessionId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "escalated", safety_flag: true }) });
    return Response.json({ message: saved, requiresCrisisProtocol: crisis }, { status: 201 });
  }
  const db = getDb();
  const crisis = /suic|me matar|não quero viver|machucar/i.test(body.content);
  const localSessionId = Number(body.sessionId);
  const [saved] = await db.insert(messages).values({ sessionId: localSessionId, role: "user", content: body.content.trim(), inputMode: body.inputMode ?? "text" }).returning();
  if (crisis) await db.update(sessions).set({ status: "escalated", safetyFlag: true }).where(eq(sessions.id, localSessionId));
  return Response.json({ message: saved, requiresCrisisProtocol: crisis }, { status: 201 });
}
