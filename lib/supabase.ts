const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const publishableKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isSupabaseConfigured = () => Boolean(url() && publishableKey() && secretKey());

export function readAccessToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.match(/(?:^|;\s*)serena_access_token=([^;]+)/)?.[1] ?? "";
}

export function authCookie(token: string, maxAge = 3600) {
  return `serena_access_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`;
}

export async function supabaseAuth(path: string, body: unknown) {
  const response = await fetch(`${url()}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: publishableKey(), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(data.msg ?? data.message ?? data.error_description ?? "Falha de autenticação"));
  return data;
}

export async function supabaseUser(token: string) {
  const response = await fetch(`${url()}/auth/v1/user`, {
    headers: { apikey: publishableKey(), authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ id: string; email?: string; user_metadata?: Record<string, unknown> }>;
}

export async function supabaseAdmin<T>(path: string, init: RequestInit = {}) {
  const key = secretKey();
  const response = await fetch(`${url()}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

