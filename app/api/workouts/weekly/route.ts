import { getChatGPTUser } from "../../../chatgpt-auth";
import { accessTokenForUser, readWeeklyWorkoutCatalog } from "../../../../lib/google";
import { attachWeeklyContinuations } from "../../../../lib/weekly-workout";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { workoutSessions } from "../../../../db/schema";

export async function GET() {
  try {
    const user=await getChatGPTUser();
    if (!user) return Response.json({error:"Please sign in to the workout site",code:"site_auth_required"},{status:401});
    const accessToken=await accessTokenForUser(user.userId);
    if (!accessToken) return Response.json({error:"Connect Google to load your seven-day workouts",code:"google_auth_required"},{status:401});
    const days=await readWeeklyWorkoutCatalog(accessToken);
    const sessions=await getDb().select({workoutDay:workoutSessions.workoutDay,sourceSheetId:workoutSessions.sourceSheetId,sheetTab:workoutSessions.sheetTab,status:workoutSessions.status}).from(workoutSessions).where(eq(workoutSessions.userId,user.userId)).orderBy(desc(workoutSessions.createdAt));
    return Response.json({days:attachWeeklyContinuations(days,sessions)},{headers:{"cache-control":"no-store"}});
  } catch (error) {
    const detail=error instanceof Error?error.message:"Unable to read weekly workouts";
    const reconnect=/insufficient|permission|scope|unauthenticated|invalid_grant/i.test(detail);
    return Response.json({error:reconnect?"Reconnect Google to allow workout-file discovery":detail,code:reconnect?"google_reauthorize_required":"weekly_catalog_error"},{status:reconnect?403:500});
  }
}
