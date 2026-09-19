import { authCookie, isSupabaseConfigured, supabaseAuth } from "../../../../lib/supabase";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Supabase ainda não configurado", code: "CLOUD_SETUP_REQUIRED" }, { status: 503 });
  const { email = "", password = "" } = await request.json() as Record<string, string>;
  try {
    const data = await supabaseAuth("token?grant_type=password", { email: email.trim().toLowerCase(), password });
    const token = String(data.access_token ?? "");
    if (!token) throw new Error("Sessão não recebida");
    return Response.json({ ok: true, user: data.user }, { headers: { "set-cookie": authCookie(token, Number(data.expires_in ?? 3600)) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "E-mail ou senha inválidos" }, { status: 401 });
  }
}

