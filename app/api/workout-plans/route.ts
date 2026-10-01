import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { workoutPlanDays, workoutPlans } from "../../../db/schema";
import { allowedConnectionForRequest } from "../../../lib/device-auth";
import { accessTokenForDevice, GoogleReauthorizationRequiredError, readWeeklyWorkoutCatalog } from "../../../lib/google";
import { LEGACY_WORKOUT_PLAN_ID } from "../../../lib/workout-plans";
import { foundWeeklyDays } from "../../../lib/weekly-workout";

export async function GET(request:Request) {
  try {
    const identity=await allowedConnectionForRequest(request);
    if (!identity.connection||!identity.deviceIdHash) return Response.json({error:"Connect Google to load workout plans",code:"google_auth_required"},{status:401});
    const accessToken=await accessTokenForDevice(identity.deviceIdHash);
    if (!accessToken) return Response.json({error:"Connect Google to load workout plans",code:"google_auth_required"},{status:401});
    const ownerEmail=identity.connection.email.trim().toLowerCase();
    const db=getDb();
    const imported=await db.select().from(workoutPlans).where(eq(workoutPlans.ownerEmail,ownerEmail)).orderBy(desc(workoutPlans.createdAt));
    const complete=imported.filter(plan=>plan.status==="complete");
    const planDays=complete.length?await db.select().from(workoutPlanDays).where(inArray(workoutPlanDays.planId,complete.map(plan=>plan.id))).orderBy(workoutPlanDays.day):[];
    let legacyDays:number[]=[];
    try { legacyDays=foundWeeklyDays(await readWeeklyWorkoutCatalog(accessToken)).map(day=>day.day); } catch { legacyDays=[]; }
    const plans=[
      ...(legacyDays.length?[{id:LEGACY_WORKOUT_PLAN_ID,name:"Current Workout",source:"drive" as const,days:legacyDays,createdAt:""}]:[]),
      ...complete.map(plan=>({id:plan.id,name:plan.name,source:"imported" as const,days:planDays.filter(day=>day.planId===plan.id).map(day=>day.day),createdAt:plan.createdAt})),
    ];
    return Response.json({plans},{headers:{"cache-control":"private, no-store"}});
  } catch (error) {
    if (error instanceof GoogleReauthorizationRequiredError) return Response.json({error:"Reconnect Google to load workout plans",code:"google_reauthorize_required"},{status:401});
    return Response.json({error:error instanceof Error?error.message:"Unable to load workout plans"},{status:500});
  }
}
