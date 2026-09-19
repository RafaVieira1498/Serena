import { getDb } from "../../../db";
import { assessments, sessions, users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { isSupabaseConfigured, readAccessToken, supabaseAdmin, supabaseUser } from "../../../lib/supabase";

export async function POST(request: Request) {
  const body = await request.json() as { name?:string; email?:string; plan?:string; concern?:string; intensity?:string; duration?:string; impact?:string[]; goal?:string; safety?:string };
  if (!body.name || !body.email || !body.concern || !body.goal || !body.duration) return Response.json({error:"Dados incompletos"},{status:400});
  if (body.safety !== "no") return Response.json({error:"Encaminhamento humano necessário"},{status:409});
  if (isSupabaseConfigured()) {
    const token = readAccessToken(request);
    const user = token ? await supabaseUser(token) : null;
    if (!user) return Response.json({ error: "Entre na sua conta para continuar" }, { status: 401 });
    await supabaseAdmin("profiles?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: user.id, email: user.email || body.email, name: body.name.trim(), plan: body.plan || "Essencial" }) });
    await supabaseAdmin("assessments", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, concern: body.concern, intensity: Number(body.intensity) || 5, duration: body.duration, impacts: body.impact || [], goal: body.goal, safety: "no" }) });
    const [session] = await supabaseAdmin<Array<{ id: string }>>("sessions?select=id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: user.id, status: "waiting", queue_position: 3 }) });
    return Response.json({ userId: user.id, sessionId: session.id }, { status: 201 });
  }
  const db = getDb();
  const userId = crypto.randomUUID();
  await db.insert(users).values({ id:userId, name:body.name.trim(), email:body.email.trim().toLowerCase(), plan:body.plan || "Essencial" }).onConflictDoNothing();
  const existing = await db.select({id:users.id}).from(users).where(eq(users.email,body.email.trim().toLowerCase())).limit(1);
  const resolvedUserId = existing[0]?.id || userId;
  await db.insert(assessments).values({ userId:resolvedUserId, concern:body.concern, intensity:Number(body.intensity)||5, duration:body.duration, impacts:body.impact||[], goal:body.goal, safety:"no" });
  const [session] = await db.insert(sessions).values({ userId:resolvedUserId, status:"waiting", queuePosition:3 }).returning();
  return Response.json({userId:resolvedUserId,sessionId:session.id},{status:201});
}
