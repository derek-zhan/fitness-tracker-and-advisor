import { allowedConnectionForRequest } from "../../../lib/device-auth";
import { accessTokenForDevice, GoogleReauthorizationRequiredError, readWeightCheckInStatus, saveWeightCheckIn, WeightAlreadyCheckedInError } from "../../../lib/google";
import { torontoDateKey, validateWeight, WeightCheckInSourceError } from "../../../lib/weight-check-in";

function identityError(status:"unauthorized"|"disconnected") {
  return status==="unauthorized"
    ? Response.json({error:"This Google account is not authorized",code:"google_not_allowed"},{status:403})
    : Response.json({error:"Connect Google Sheets to check in",code:"google_auth_required"},{status:401});
}

function routeError(error:unknown) {
  if (error instanceof GoogleReauthorizationRequiredError) return Response.json({error:"Reconnect Google Sheets",code:"google_reauthorize_required"},{status:401});
  if (error instanceof WeightCheckInSourceError) return Response.json({error:error.message,code:error.code},{status:error.code==="weight_spreadsheet_not_found"?404:409});
  if (error instanceof WeightAlreadyCheckedInError) return Response.json({error:error.message,code:"weight_already_checked_in"},{status:409});
  return Response.json({error:error instanceof Error?error.message:"Unable to update weight check-in",code:"weight_check_in_error"},{status:500});
}

export async function GET(request:Request) {
  try {
    const identity=await allowedConnectionForRequest(request);
    if (identity.status!=="connected"||!identity.deviceIdHash) return identityError(identity.status);
    const accessToken=await accessTokenForDevice(identity.deviceIdHash);
    if (!accessToken) return identityError("disconnected");
    return Response.json(await readWeightCheckInStatus(accessToken,torontoDateKey()),{headers:{"cache-control":"no-store"}});
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request:Request) {
  try {
    const identity=await allowedConnectionForRequest(request);
    if (identity.status!=="connected"||!identity.deviceIdHash) return identityError(identity.status);
    const body=await request.json() as {weight?:unknown};
    let weight:number;
    try { weight=validateWeight(body.weight); }
    catch (error) { return Response.json({error:error instanceof Error?error.message:"Enter a valid weight",code:"invalid_weight"},{status:400}); }
    const accessToken=await accessTokenForDevice(identity.deviceIdHash);
    if (!accessToken) return identityError("disconnected");
    return Response.json(await saveWeightCheckIn(accessToken,torontoDateKey(),weight),{status:201});
  } catch (error) {
    return routeError(error);
  }
}
