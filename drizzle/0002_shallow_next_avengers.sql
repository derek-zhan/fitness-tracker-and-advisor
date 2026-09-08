CREATE TABLE `google_device_connections` (
	`device_id_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`encrypted_refresh_token` text NOT NULL,
	`connected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `google_device_oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`device_id_hash` text NOT NULL,
	`code_verifier` text NOT NULL,
	`workout_day` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
DROP TABLE `google_connections`;--> statement-breakpoint
DROP TABLE `google_oauth_states`;--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `device_id_hash` text;