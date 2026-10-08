CREATE TABLE `workout_plan_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` text NOT NULL,
	`day` integer NOT NULL,
	`day_name` text NOT NULL,
	`source_sheet_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workout_plan_days_plan_day` ON `workout_plan_days` (`plan_id`,`day`);--> statement-breakpoint
CREATE INDEX `idx_workout_plan_days_plan_id` ON `workout_plan_days` (`plan_id`);--> statement-breakpoint
CREATE TABLE `workout_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`status` text DEFAULT 'provisioning' NOT NULL,
	`drive_folder_id` text,
	`source_file_id` text,
	`source_file_name` text NOT NULL,
	`source_mime_type` text NOT NULL,
	`import_request_id` text NOT NULL,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workout_plans_owner_name` ON `workout_plans` (`owner_email`,`normalized_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workout_plans_import_request` ON `workout_plans` (`import_request_id`);--> statement-breakpoint
ALTER TABLE `google_device_connections` ADD `granted_scopes` text;