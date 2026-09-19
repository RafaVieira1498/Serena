import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { knowledgeDocuments, users } from "../../../db/schema";

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(knowledgeDocuments).orderBy(desc(knowledgeDocuments.createdAt)).limit(100);
  return Response.json({ documents: rows });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const category = String(form.get("category") ?? "Geral").trim();
  if (!(file instanceof File) || !file.size) return Response.json({ error: "file is required" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return Response.json({ error: "maximum file size is 20 MB" }, { status: 413 });
  const allowed = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowed.includes(file.type)) return Response.json({ error: "unsupported file type" }, { status: 415 });

  const id = request.headers.get("oai-authenticated-user-id") ?? "local-admin";
  const email = request.headers.get("oai-authenticated-user-email") ?? "admin@local.serena";
  const key = `knowledge/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await env.DOCUMENTS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  const db = getDb();
  await db.insert(users).values({ id, email, name: email, role: "admin" }).onConflictDoNothing();
  const [document] = await db.insert(knowledgeDocuments).values({ title: file.name, category, objectKey: key, mimeType: file.type, createdBy: id }).returning();
  return Response.json({ document }, { status: 201 });
}

export async function DELETE(request: Request) {
  const documentId = Number(new URL(request.url).searchParams.get("id"));
  if (!documentId) return Response.json({ error: "id is required" }, { status: 400 });
  const db = getDb();
  const [document] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, documentId));
  if (!document) return Response.json({ error: "not found" }, { status: 404 });
  await env.DOCUMENTS.delete(document.objectKey);
  await db.update(knowledgeDocuments).set({ status: "archived" }).where(eq(knowledgeDocuments.id, documentId));
  return Response.json({ archived: true });
}
