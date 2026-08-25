import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { workoutSessions, workoutSets } from "../../../db/schema";

type Payload = {
  action?: "start" | "set" | "finish";
  day?: number;
  sheetId?: string;
  date?: string;
  sessionId?: string;
  exercise?: string;
  setNumber?: number;
  reps?: number;
  load?: number;
  durationMinutes?: number;
  totalSets?: number;
};

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Payload;
    const db = getDb();
    if (payload.action === "start") {
      if (!payload.day || !payload.sheetId || !payload.date) return Response.json({ error:"Missing workout details" }, { status:400 });
      const sessionId = crypto.randomUUID();
      await db.insert(workoutSessions).values({ id:sessionId, workoutDay:payload.day, sourceSheetId:payload.sheetId, workoutDate:payload.date });
      return Response.json({ sessionId }, { status:201 });
    }
    if (payload.action === "set") {
      if (!payload.sessionId || !payload.day || !payload.exercise || !payload.setNumber) return Response.json({ error:"Missing set details" }, { status:400 });
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
