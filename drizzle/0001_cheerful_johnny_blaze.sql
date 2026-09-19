CREATE INDEX `idx_documents_status_category` ON `knowledge_documents` (`status`,`category`);--> statement-breakpoint
CREATE INDEX `idx_messages_session_created` ON `messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_started` ON `sessions` (`user_id`,`started_at`);