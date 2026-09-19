import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  plan: text("plan").notNull().default("Essencial"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const assessments = sqliteTable("assessments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  concern: text("concern").notNull(),
  intensity: integer("intensity").notNull(),
  duration: text("duration").notNull(),
  impacts: text("impacts", { mode: "json" }).$type<string[]>().notNull().default([]),
  goal: text("goal").notNull(),
  safety: text("safety").notNull().default("no"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_assessments_user_created").on(table.userId, table.createdAt)]);

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  status: text("status", { enum: ["waiting", "active", "closed", "escalated"] }).notNull().default("waiting"),
  queuePosition: integer("queue_position").notNull().default(0),
  safetyFlag: integer("safety_flag", { mode: "boolean" }).notNull().default(false),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  endedAt: text("ended_at"),
}, (table) => [index("idx_sessions_user_started").on(table.userId, table.startedAt)]);

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  inputMode: text("input_mode", { enum: ["text", "audio"] }).notNull().default("text"),
  citations: text("citations", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_messages_session_created").on(table.sessionId, table.createdAt)]);

export const knowledgeDocuments = sqliteTable("knowledge_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  objectKey: text("object_key").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  status: text("status", { enum: ["processing", "active", "archived", "failed"] }).notNull().default("processing"),
  chunkCount: integer("chunk_count").notNull().default(0),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_documents_status_category").on(table.status, table.category)]);

export const knowledgeChunks = sqliteTable("knowledge_chunks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").notNull().references(() => knowledgeDocuments.id),
  content: text("content").notNull(),
  embeddingRef: text("embedding_ref"),
  page: integer("page"),
});

export const safetyEvents = sqliteTable("safety_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  level: text("level", { enum: ["attention", "crisis", "emergency"] }).notNull(),
  matchedRule: text("matched_rule").notNull(),
  actionTaken: text("action_taken").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
