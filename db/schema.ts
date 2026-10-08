import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const workoutSessions = sqliteTable("workout_sessions", {
  id: text("id").primaryKey(),
  workoutDay: integer("workout_day").notNull(),
  sourceSheetId: text("source_sheet_id").notNull(),
  workoutDate: text("workout_date").notNull(),
  userId: text("user_id"),
  deviceIdHash: text("device_id_hash"),
  sheetTab: text("sheet_tab"),
  status: text("status").notNull().default("active"),
  durationMinutes: integer("duration_minutes"),
  totalSets: integer("total_sets").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
}, (table) => [index("idx_workout_sessions_device_id_hash").on(table.deviceIdHash)]);

export const googleConnections = sqliteTable("google_device_connections", {
  deviceIdHash: text("device_id_hash").primaryKey(),
  email: text("email").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  grantedScopes: text("granted_scopes"),
  connectedAt: text("connected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const googleOauthStates = sqliteTable("google_device_oauth_states", {
  state: text("state").primaryKey(),
  deviceIdHash: text("device_id_hash").notNull(),
  codeVerifier: text("code_verifier").notNull(),
  workoutDay: integer("workout_day").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const workoutSets = sqliteTable("workout_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  workoutDay: integer("workout_day").notNull(),
  exercise: text("exercise").notNull(),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  load: real("load").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workoutPlans = sqliteTable("workout_plans", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  status: text("status").notNull().default("provisioning"),
  driveFolderId: text("drive_folder_id"),
  sourceFileId: text("source_file_id"),
  sourceFileName: text("source_file_name").notNull(),
  sourceMimeType: text("source_mime_type").notNull(),
  importRequestId: text("import_request_id").notNull(),
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_workout_plans_owner_name").on(table.ownerEmail, table.normalizedName),
  uniqueIndex("idx_workout_plans_import_request").on(table.importRequestId),
]);

export const workoutPlanDays = sqliteTable("workout_plan_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: text("plan_id").notNull(),
  day: integer("day").notNull(),
  dayName: text("day_name").notNull(),
  sourceSheetId: text("source_sheet_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_workout_plan_days_plan_day").on(table.planId, table.day),
  index("idx_workout_plan_days_plan_id").on(table.planId),
]);
