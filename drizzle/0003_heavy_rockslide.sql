CREATE INDEX `idx_workout_sessions_device_id_hash` ON `workout_sessions` (`device_id_hash`);
--> statement-breakpoint
PRAGMA optimize;
