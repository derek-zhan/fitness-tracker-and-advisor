CREATE TABLE `workout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_day` integer NOT NULL,
	`source_sheet_id` text NOT NULL,
	`workout_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`duration_minutes` integer,
	`total_sets` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`workout_day` integer NOT NULL,
	`exercise` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer NOT NULL,
	`load` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
