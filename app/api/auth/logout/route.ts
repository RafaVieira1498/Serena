import { authCookie } from "../../../../lib/supabase";

export async function POST() {
  return Response.json({ ok: true }, { headers: { "set-cookie": authCookie("", 0) } });
}

