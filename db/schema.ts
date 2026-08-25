import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workoutSessions = sqliteTable("workout_sessions", {
  id: text("id").primaryKey(),
  workoutDay: integer("workout_day").notNull(),
  sourceSheetId: text("source_sheet_id").notNull(),
  workoutDate: text("workout_date").notNull(),
  userId: text("user_id"),
  sheetTab: text("sheet_tab"),
  status: text("status").notNull().default("active"),
  durationMinutes: integer("duration_minutes"),
  totalSets: integer("total_sets").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});

export const googleConnections = sqliteTable("google_connections", {
  userId: text("user_id").primaryKey(),
  email: text("email"),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  connectedAt: text("connected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const googleOauthStates = sqliteTable("google_oauth_states", {
  state: text("state").primaryKey(),
  userId: text("user_id").notNull(),
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
