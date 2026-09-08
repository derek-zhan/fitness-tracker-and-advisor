import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { googleConnections, googleOauthStates } from "../../../../db/schema";
import { deviceCookie, deviceIdFromRequest, hashDeviceId, isGoogleEmailAllowed } from "../../../../lib/device-auth";
import { encryptToken, googleClientId, googleClientSecret } from "../../../../lib/google";

function redirect(url: URL, result: string, cookie?: string) {
  const headers = new Headers({ location:`${url.origin}/?google=${result}` });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(null, { status:302, headers });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const stateValue = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const deviceId = deviceIdFromRequest(request);
  if (!stateValue || !code || !deviceId) return redirect(url, "denied");
  const db = getDb();
  const [state] = await db.select().from(googleOauthStates).where(eq(googleOauthStates.state, stateValue)).limit(1);
  if (!state || state.expiresAt < Date.now() || state.deviceIdHash !== await hashDeviceId(deviceId)) return redirect(url, "expired");
  await db.delete(googleOauthStates).where(eq(googleOauthStates.state, stateValue));
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST", headers:{ "content-type":"application/x-www-form-urlencoded" },
    body:new URLSearchParams({ code, client_id:googleClientId(), client_secret:googleClientSecret(), redirect_uri:`${url.origin}/api/google/callback`, grant_type:"authorization_code", code_verifier:state.codeVerifier }),
  });
  const tokens = await tokenResponse.json() as { access_token?:string; refresh_token?:string };
  if (!tokenResponse.ok || !tokens.refresh_token || !tokens.access_token) return redirect(url, "failed");
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers:{ authorization:`Bearer ${tokens.access_token}` } });
  if (!profileResponse.ok) return redirect(url, "failed");
  const profile = await profileResponse.json() as { email?:string; email_verified?:boolean };
  const email = profile.email?.trim().toLowerCase();
  if (!email || profile.email_verified !== true || !isGoogleEmailAllowed(email)) return redirect(url, "not_allowed");
  const encryptedRefreshToken = await encryptToken(tokens.refresh_token);
  await db.insert(googleConnections).values({ deviceIdHash:state.deviceIdHash, email, encryptedRefreshToken }).onConflictDoUpdate({
    target:googleConnections.deviceIdHash,
    set:{ email, encryptedRefreshToken, updatedAt:new Date().toISOString() },
  });
  const day = Math.min(7, Math.max(1, state.workoutDay - 200));
  return new Response(null, { status:302, headers:{ location:`${url.origin}/?google=connected&day=${day}`, "set-cookie":deviceCookie(deviceId, request.url) } });
}
