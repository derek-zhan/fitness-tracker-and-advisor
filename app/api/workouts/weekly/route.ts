import { allowedConnectionForRequest } from "../../../../lib/device-auth";
import { accessTokenForDevice, GoogleReauthorizationRequiredError, readWeeklyWorkoutCatalog } from "../../../../lib/google";
import { attachWeeklyContinuations } from "../../../../lib/weekly-workout";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { workoutSessions } from "../../../../db/schema";

export async function GET(request: Request) {
  try {
    const identity=await allowedConnectionForRequest(request);
    if (identity.status === "unauthorized") return Response.json({error:"This Google account is not authorized",code:"google_not_allowed"},{status:403});
    if (!identity.deviceIdHash) return Response.json({error:"Connect Google to load your seven-day workouts",code:"google_auth_required"},{status:401});
    const accessToken=await accessTokenForDevice(identity.deviceIdHash);
    if (!accessToken) return Response.json({error:"Connect Google to load your seven-day workouts",code:"google_auth_required"},{status:401});
    const days=await readWeeklyWorkoutCatalog(accessToken);
    const sessions=await getDb().select({workoutDay:workoutSessions.workoutDay,sourceSheetId:workoutSessions.sourceSheetId,sheetTab:workoutSessions.sheetTab,status:workoutSessions.status}).from(workoutSessions).where(eq(workoutSessions.deviceIdHash,identity.deviceIdHash)).orderBy(desc(workoutSessions.createdAt));
    return Response.json({days:attachWeeklyContinuations(days,sessions)},{headers:{"cache-control":"no-store"}});
  } catch (error) {
    if (error instanceof GoogleReauthorizationRequiredError) return Response.json({error:"Reconnect Google to allow workout-file discovery",code:"google_reauthorize_required"},{status:401});
    const detail=error instanceof Error?error.message:"Unable to read weekly workouts";
    const reconnect=/insufficient|permission|scope|unauthenticated|invalid_grant/i.test(detail);
    return Response.json({error:reconnect?"Reconnect Google to allow workout-file discovery":detail,code:reconnect?"google_reauthorize_required":"weekly_catalog_error"},{status:reconnect?403:500});
  }
}
