CREATE TABLE `google_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text,
	`encrypted_refresh_token` text NOT NULL,
	`connected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `google_oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_verifier` text NOT NULL,
	`workout_day` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `sheet_tab` text;