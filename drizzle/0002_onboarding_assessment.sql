ALTER TABLE `users` ADD `plan` text DEFAULT 'Essencial' NOT NULL;--> statement-breakpoint
CREATE TABLE `assessments` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `concern` text NOT NULL,
  `intensity` integer NOT NULL,
  `duration` text NOT NULL,
  `impacts` text DEFAULT '[]' NOT NULL,
  `goal` text NOT NULL,
  `safety` text DEFAULT 'no' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `idx_assessments_user_created` ON `assessments` (`user_id`,`created_at`);
