import { authCookie, isSupabaseConfigured, supabaseAdmin, supabaseAuth } from "../../../../lib/supabase";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: "Supabase ainda não configurado", code: "CLOUD_SETUP_REQUIRED" }, { status: 503 });
  const { email = "", password = "", name = "" } = await request.json() as Record<string, string>;
  if (!email.trim() || password.length < 6 || !name.trim()) return Response.json({ error: "Informe nome, e-mail e uma senha com pelo menos 6 caracteres" }, { status: 400 });
  try {
    const data = await supabaseAuth("signup", { email: email.trim().toLowerCase(), password, data: { name: name.trim() } });
    const user = data.user as { id?: string } | undefined;
    const token = String(data.access_token ?? "");
    if (user?.id) await supabaseAdmin("profiles?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: user.id, email: email.trim().toLowerCase(), name: name.trim() }),
    });
    const headers = token ? { "set-cookie": authCookie(token, Number(data.expires_in ?? 3600)) } : undefined;
    return Response.json({ ok: true, confirmationRequired: !token, userId: user?.id }, { status: 201, headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar a conta" }, { status: 400 });
  }
}

