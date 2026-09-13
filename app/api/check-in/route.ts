import { allowedConnectionForRequest } from "../../../lib/device-auth";
import { CheckInAlreadyCompletedError, CheckInSourceError, InvalidCheckInAnswersError, type CheckInAnswer } from "../../../lib/check-in";
import { accessTokenForDevice, GoogleReauthorizationRequiredError, readCheckInExperience, saveCheckIn } from "../../../lib/google";
import { torontoDateKey, WeightCheckInSourceError } from "../../../lib/weight-check-in";

function identityError(status:"unauthorized"|"disconnected") {
  return status==="unauthorized"
    ? Response.json({error:"This Google account is not authorized",code:"google_not_allowed"},{status:403})
    : Response.json({error:"Connect Google Sheets to check in",code:"google_auth_required"},{status:401});
}

function routeError(error:unknown) {
  if (error instanceof GoogleReauthorizationRequiredError) return Response.json({error:"Reconnect Google Sheets",code:"google_reauthorize_required"},{status:401});
  if (error instanceof WeightCheckInSourceError) return Response.json({error:error.message,code:error.code},{status:error.code==="weight_spreadsheet_not_found"?404:409});
  if (error instanceof CheckInSourceError) return Response.json({error:error.message,code:error.code},{status:error.code==="check_in_tab_not_found"?404:409});
  if (error instanceof CheckInAlreadyCompletedError) return Response.json({error:error.message,code:"check_in_already_completed"},{status:409});
  if (error instanceof InvalidCheckInAnswersError) return Response.json({error:error.message,code:"invalid_answers"},{status:400});
  return Response.json({error:error instanceof Error?error.message:"Unable to update check-in",code:"check_in_error"},{status:500});
}

async function authenticatedToken(request:Request) {
  const identity=await allowedConnectionForRequest(request);
  if (identity.status!=="connected"||!identity.deviceIdHash) return {error:identityError(identity.status==="unauthorized"?"unauthorized":"disconnected")};
  const accessToken=await accessTokenForDevice(identity.deviceIdHash);
  if (!accessToken) return {error:identityError("disconnected")};
  return {accessToken};
}

export async function GET(request:Request) {
  try {
    const authentication=await authenticatedToken(request);
    if (authentication.error) return authentication.error;
    return Response.json(await readCheckInExperience(authentication.accessToken!,torontoDateKey()),{headers:{"cache-control":"no-store"}});
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request:Request) {
  try {
    const authentication=await authenticatedToken(request);
    if (authentication.error) return authentication.error;
    const body=await request.json() as {answers?:unknown};
    if (!Array.isArray(body.answers)) return Response.json({error:"Answers are required",code:"invalid_answers"},{status:400});
    const answers=body.answers.map((answer):CheckInAnswer=>{
      const item=answer as Partial<CheckInAnswer>;
      return {column:Number(item.column),label:String(item.label??""),value:String(item.value??"")};
    });
    return Response.json(await saveCheckIn(authentication.accessToken!,torontoDateKey(),answers),{status:201});
  } catch (error) {
    return routeError(error);
  }
}
