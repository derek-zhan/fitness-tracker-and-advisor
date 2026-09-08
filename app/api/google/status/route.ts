import { allowedConnectionForRequest, deviceCookie, deviceIdFromRequest } from "../../../../lib/device-auth";
import { accessTokenForDevice, GoogleReauthorizationRequiredError } from "../../../../lib/google";
import { isOwnerGoogleEmail } from "../../../../lib/owner-workouts";

export async function GET(request: Request) {
  const result = await allowedConnectionForRequest(request);
  if (result.status === "unauthorized") return Response.json({ status:"unauthorized", connected:false }, { status:403 });
  if (!result.connection || !result.deviceIdHash) return Response.json({ status:"disconnected", connected:false });
  try {
    await accessTokenForDevice(result.deviceIdHash);
    const headers = new Headers({ "cache-control":"no-store" });
    const deviceId = deviceIdFromRequest(request);
    if (deviceId) headers.set("set-cookie", deviceCookie(deviceId, request.url));
    return Response.json({ status:"connected", connected:true, email:result.connection.email, personalPrograms:isOwnerGoogleEmail(result.connection.email) }, { headers });
  } catch (error) {
    if (error instanceof GoogleReauthorizationRequiredError) return Response.json({ status:"reauthorization_required", connected:false }, { status:401 });
    throw error;
  }
}
