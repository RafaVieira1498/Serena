import { isSupabaseConfigured, readAccessToken, supabaseUser } from "../../../../lib/supabase";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ user: null, configured: false });
  const token = readAccessToken(request);
  const user = token ? await supabaseUser(token) : null;
  return Response.json({ user, configured: true }, { status: user ? 200 : 401 });
}
