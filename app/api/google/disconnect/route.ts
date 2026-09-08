import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { googleConnections } from "../../../../db/schema";
import { deviceHashFromRequest, expiredDeviceCookie } from "../../../../lib/device-auth";

export async function POST(request: Request) {
  const deviceIdHash = await deviceHashFromRequest(request);
  if (deviceIdHash) await getDb().delete(googleConnections).where(eq(googleConnections.deviceIdHash, deviceIdHash));
  return Response.json({ disconnected:true }, { headers:{ "set-cookie":expiredDeviceCookie(request.url), "cache-control":"no-store" } });
}
