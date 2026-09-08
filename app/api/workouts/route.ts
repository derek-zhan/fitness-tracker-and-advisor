import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { workoutSessions, workoutSets } from "../../../db/schema";
import { allowedConnectionForRequest } from "../../../lib/device-auth";
import { accessTokenForDevice, createWeeklyWorkout, finishWeeklyWorkout, GoogleReauthorizationRequiredError, readPreviousWeeklyWorkoutSets, readWeeklyWorkoutCatalog, resumeWeeklyWorkout, sheetTabExists, writeWeeklyWorkoutDate, writeWeeklyWorkoutSet } from "../../../lib/google";

type Payload = {
  action?: "start" | "set" | "finish";
  mode?: "new" | "continue";
  program?: "weekly7";
  day?: number;
  dayLabel?: string;
  workoutType?: string;
  sheetId?: string;
  date?: string;
  sessionId?: string;
  exercise?: string;
  exerciseOrder?: string;
  setNumber?: number;
  exerciseIndex?: number;
  reps?: number;
  load?: number;
  durationMinutes?: number;
  totalSets?: number;
  cardioCompleted?: boolean;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Payload;
    const db = getDb();
    const identity = await allowedConnectionForRequest(request);
    if (identity.status === "unauthorized") return Response.json({ error:"This Google account is not authorized", code:"google_not_allowed" }, { status:403 });
    if (!identity.deviceIdHash) return Response.json({ error:"Connect Google Sheets before starting", code:"google_auth_required" }, { status:401 });
    if (payload.action === "start") {
      if (!payload.day || payload.program!=="weekly7" || !payload.date) return Response.json({ error:"Missing workout details" }, { status:400 });
      const accessToken = await accessTokenForDevice(identity.deviceIdHash);
      if (!accessToken) return Response.json({ error:"Connect Google Sheets before starting", code:"google_auth_required" }, { status:401 });
      const continueWeekly = payload.mode === "continue";
      let latestWeeklyTab="";
      const entry=(await readWeeklyWorkoutCatalog(accessToken))[payload.day-1];
      if (!entry?.available || !entry.workout) return Response.json({error:entry?.error || "Workout sheet was not found"},{status:404});
      const sourceSheetId=entry.workout.sheetId;
      latestWeeklyTab=entry.workout.sheetTab;
      if (!sourceSheetId) return Response.json({ error:"Missing workout sheet" }, { status:400 });
      const requestedWorkoutDay = 200 + payload.day;
      const activeSessions = await db.select().from(workoutSessions).where(and(eq(workoutSessions.deviceIdHash,identity.deviceIdHash),eq(workoutSessions.status,"active"),eq(workoutSessions.workoutDay,requestedWorkoutDay),eq(workoutSessions.sourceSheetId,sourceSheetId))).orderBy(desc(workoutSessions.createdAt)).limit(1);
      let activeSession:typeof workoutSessions.$inferSelect|undefined=activeSessions[0];
      if (activeSession && (!activeSession.sheetTab || !await sheetTabExists(accessToken, activeSession.sourceSheetId, activeSession.sheetTab))) {
        await db.update(workoutSessions).set({ status:"abandoned", completedAt:new Date().toISOString() }).where(eq(workoutSessions.id,activeSession.id));
        activeSession = undefined;
      }
      if (continueWeekly&&(!activeSession||activeSession.sheetTab!==latestWeeklyTab)) return Response.json({error:"The latest workout does not have an unfinished session to continue"},{status:409});
      if (!continueWeekly&&activeSession) {
        await db.update(workoutSessions).set({status:"abandoned",completedAt:new Date().toISOString()}).where(eq(workoutSessions.id,activeSession.id));
        activeSession=undefined;
      }
      if (activeSession) {
        const savedSets = await db.select({ exercise:workoutSets.exercise, setNumber:workoutSets.setNumber, reps:workoutSets.reps, load:workoutSets.load }).from(workoutSets).where(eq(workoutSets.sessionId,activeSession.id)).orderBy(workoutSets.id);
        const resumedDay = activeSession.workoutDay - 200;
        const weeklySource=await resumeWeeklyWorkout(accessToken,activeSession.sourceSheetId,activeSession.sheetTab!,resumedDay);
        await writeWeeklyWorkoutDate(accessToken,activeSession.sourceSheetId,activeSession.sheetTab!,new Date(activeSession.workoutDate));
        const previousSets = await readPreviousWeeklyWorkoutSets(accessToken,weeklySource.workout);
        return Response.json({ sessionId:activeSession.id, workoutDay:activeSession.workoutDay, workoutDate:activeSession.workoutDate, sets:savedSets, previousSets, workout:weeklySource.workout, resumed:true });
      }
      const weeklyWorkout=await createWeeklyWorkout(accessToken,payload.day,new Date(payload.date));
      const sheetTab = weeklyWorkout.workout.sheetTab;
      const sessionId = crypto.randomUUID();
      await db.insert(workoutSessions).values({ id:sessionId, workoutDay:requestedWorkoutDay, sourceSheetId, workoutDate:payload.date, deviceIdHash:identity.deviceIdHash, sheetTab });
      return Response.json({ sessionId, sheetTab, workout:weeklyWorkout.workout, previousSets:weeklyWorkout.previousSets || [] }, { status:201 });
    }
    if (payload.action === "set") {
      if (!payload.sessionId || !payload.day || !payload.exercise || !payload.setNumber || payload.exerciseIndex === undefined) return Response.json({ error:"Missing set details" }, { status:400 });
      const [session] = await db.select().from(workoutSessions).where(eq(workoutSessions.id,payload.sessionId)).limit(1);
      if (!session || session.deviceIdHash !== identity.deviceIdHash || !session.sheetTab) return Response.json({ error:"Workout session was not found" }, { status:404 });
      const accessToken = await accessTokenForDevice(identity.deviceIdHash);
      if (!accessToken) return Response.json({ error:"Reconnect Google Sheets", code:"google_auth_required" }, { status:401 });
      let sheetTab = session.sheetTab;
      if (!await sheetTabExists(accessToken, session.sourceSheetId, sheetTab)) {
        const resumedDay = session.workoutDay - 200;
        if (session.workoutDay <= 200) return Response.json({error:"This workout program is no longer available"},{status:410});
        sheetTab = (await createWeeklyWorkout(accessToken,resumedDay,new Date(session.workoutDate))).workout.sheetTab;
        await db.update(workoutSessions).set({ sheetTab }).where(eq(workoutSessions.id,session.id));
      }
      if (session.workoutDay>200) {
        if (!payload.exerciseOrder) return Response.json({error:"Missing exercise order"},{status:400});
        const day=session.workoutDay-200;
        const source=await resumeWeeklyWorkout(accessToken,session.sourceSheetId,sheetTab,day);
        await writeWeeklyWorkoutSet(accessToken,source.workout,payload.exerciseOrder,payload.exercise,payload.setNumber,payload.reps??0,payload.load??0);
      }
      const setMatch=and(eq(workoutSets.sessionId,payload.sessionId),eq(workoutSets.exercise,payload.exercise),eq(workoutSets.setNumber,payload.setNumber));
      const [existingSet]=await db.select({id:workoutSets.id}).from(workoutSets).where(setMatch).limit(1);
      if (existingSet) await db.update(workoutSets).set({reps:payload.reps??0,load:payload.load??0}).where(setMatch);
      else await db.insert(workoutSets).values({ sessionId:payload.sessionId, workoutDay:session.workoutDay, exercise:payload.exercise, setNumber:payload.setNumber, reps:payload.reps ?? 0, load:payload.load ?? 0 });
      return Response.json({ saved:true });
    }
    if (payload.action === "finish") {
      if (!payload.sessionId) return Response.json({ error:"Missing session" }, { status:400 });
      const [session]=await db.select().from(workoutSessions).where(eq(workoutSessions.id,payload.sessionId)).limit(1);
      if (!session || session.deviceIdHash!==identity.deviceIdHash) return Response.json({error:"Workout session was not found"},{status:404});
      if (session.workoutDay>200&&session.sheetTab) {
        const accessToken=await accessTokenForDevice(identity.deviceIdHash);
        if (!accessToken) return Response.json({error:"Reconnect Google Sheets",code:"google_auth_required"},{status:401});
        const source=await resumeWeeklyWorkout(accessToken,session.sourceSheetId,session.sheetTab,session.workoutDay-200);
        await finishWeeklyWorkout(accessToken,source.workout,Boolean(payload.cardioCompleted),payload.notes||"");
      }
      await db.update(workoutSessions).set({ status:"complete", durationMinutes:payload.durationMinutes ?? 0, totalSets:payload.totalSets ?? 0, completedAt:new Date().toISOString() }).where(eq(workoutSessions.id,payload.sessionId));
      return Response.json({ complete:true });
    }
    return Response.json({ error:"Unknown action" }, { status:400 });
  } catch (error) {
    if (error instanceof GoogleReauthorizationRequiredError) return Response.json({ error:"Reconnect Google Sheets", code:"google_reauthorize_required" }, { status:401 });
    const message = error instanceof Error ? error.message : "Unable to save workout";
    return Response.json({ error:message }, { status:500 });
  }
}
