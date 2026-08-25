import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { workoutSessions, workoutSets } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { accessTokenForUser, createWorkoutWeek, writeWorkoutSet } from "../../../lib/google";

type Payload = {
  action?: "start" | "set" | "finish";
  day?: number;
  sheetId?: string;
  date?: string;
  sessionId?: string;
  exercise?: string;
  setNumber?: number;
  exerciseIndex?: number;
  reps?: number;
  load?: number;
  durationMinutes?: number;
  totalSets?: number;
};

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Payload;
    const db = getDb();
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error:"Please sign in to the workout site" }, { status:401 });
    if (payload.action === "start") {
      if (!payload.day || !payload.sheetId || !payload.date) return Response.json({ error:"Missing workout details" }, { status:400 });
      const accessToken = await accessTokenForUser(user.userId);
      if (!accessToken) return Response.json({ error:"Connect Google Drive before starting", code:"google_auth_required" }, { status:401 });
      const exerciseSets: Record<number, number[]> = { 1:[4,4,3,4,3,3,3], 2:[4,4,3,4,3], 3:[4,4,4,4,4,3,3], 4:[4,3,4,3,3] };
      const sheetTab = await createWorkoutWeek(accessToken, payload.sheetId, new Date(payload.date), exerciseSets[payload.day] || []);
      const sessionId = crypto.randomUUID();
      await db.insert(workoutSessions).values({ id:sessionId, workoutDay:payload.day, sourceSheetId:payload.sheetId, workoutDate:payload.date, userId:user.userId, sheetTab });
      return Response.json({ sessionId, sheetTab }, { status:201 });
    }
    if (payload.action === "set") {
      if (!payload.sessionId || !payload.day || !payload.exercise || !payload.setNumber || payload.exerciseIndex === undefined) return Response.json({ error:"Missing set details" }, { status:400 });
      const [session] = await db.select().from(workoutSessions).where(eq(workoutSessions.id,payload.sessionId)).limit(1);
      if (!session || (session.userId && session.userId !== user.userId) || !session.sheetTab) return Response.json({ error:"Workout session was not found" }, { status:404 });
      const accessToken = await accessTokenForUser(user.userId);
      if (!accessToken) return Response.json({ error:"Reconnect Google Drive", code:"google_auth_required" }, { status:401 });
      await writeWorkoutSet(accessToken, session.sourceSheetId, session.sheetTab, payload.exerciseIndex, payload.setNumber, payload.reps ?? 0, payload.load ?? 0);
      await db.insert(workoutSets).values({ sessionId:payload.sessionId, workoutDay:payload.day, exercise:payload.exercise, setNumber:payload.setNumber, reps:payload.reps ?? 0, load:payload.load ?? 0 });
      return Response.json({ saved:true });
    }
    if (payload.action === "finish") {
      if (!payload.sessionId) return Response.json({ error:"Missing session" }, { status:400 });
      await db.update(workoutSessions).set({ status:"complete", durationMinutes:payload.durationMinutes ?? 0, totalSets:payload.totalSets ?? 0, completedAt:new Date().toISOString() }).where(eq(workoutSessions.id,payload.sessionId));
      return Response.json({ complete:true });
    }
    return Response.json({ error:"Unknown action" }, { status:400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save workout";
    return Response.json({ error:message }, { status:500 });
  }
}
