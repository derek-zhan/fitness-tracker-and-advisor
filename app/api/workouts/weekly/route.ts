import { getChatGPTUser } from "../../../chatgpt-auth";
import { accessTokenForUser, readWeeklyWorkoutCatalog } from "../../../../lib/google";

export async function GET() {
  try {
    const user=await getChatGPTUser();
    if (!user) return Response.json({error:"Please sign in to the workout site",code:"site_auth_required"},{status:401});
    const accessToken=await accessTokenForUser(user.userId);
    if (!accessToken) return Response.json({error:"Connect Google to load your seven-day workouts",code:"google_auth_required"},{status:401});
    return Response.json({days:await readWeeklyWorkoutCatalog(accessToken)},{headers:{"cache-control":"no-store"}});
  } catch (error) {
    const detail=error instanceof Error?error.message:"Unable to read weekly workouts";
    const reconnect=/insufficient|permission|scope|unauthenticated|invalid_grant/i.test(detail);
    return Response.json({error:reconnect?"Reconnect Google to allow workout-file discovery":detail,code:reconnect?"google_reauthorize_required":"weekly_catalog_error"},{status:reconnect?403:500});
  }
}
