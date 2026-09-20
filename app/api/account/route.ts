import { isSupabaseConfigured, readAccessToken, supabaseAdmin, supabaseUser } from "../../../lib/supabase";

type SessionRow = { id: string; status: string; summary: string | null; started_at: string; ended_at: string | null };
type MessageRow = { session_id: string; role: string; content: string; created_at: string };

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Supabase ainda não configurado" }, { status: 503 });
  const token = readAccessToken(request);
  const user = token ? await supabaseUser(token) : null;
  if (!user) return Response.json({ error: "Sessão expirada" }, { status: 401 });

  const [profiles, assessments, sessions] = await Promise.all([
    supabaseAdmin<Array<{ name: string; email: string; plan: string }>>(`profiles?id=eq.${user.id}&select=name,email,plan&limit=1`),
    supabaseAdmin<Array<{ concern: string; intensity: number; duration: string; impacts: string[]; goal: string; created_at: string }>>(`assessments?user_id=eq.${user.id}&select=concern,intensity,duration,impacts,goal,created_at&order=created_at.desc&limit=1`),
    supabaseAdmin<SessionRow[]>(`sessions?user_id=eq.${user.id}&select=id,status,summary,started_at,ended_at&order=started_at.desc&limit=20`),
  ]);

  const recent = sessions[0];
  const messages = recent
    ? await supabaseAdmin<MessageRow[]>(`messages?session_id=eq.${recent.id}&select=session_id,role,content,created_at&order=created_at.asc&limit=100`)
    : [];

  return Response.json({
    user: { id: user.id, email: user.email, name: profiles[0]?.name || user.email?.split("@")[0] || "Você", plan: profiles[0]?.plan || "Essencial" },
    assessment: assessments[0] || null,
    sessions,
    currentSessionId: recent?.id || null,
    messages,
  });
}
