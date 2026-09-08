import { getDb } from "../../../../db";
import { googleOauthStates } from "../../../../db/schema";
import { deviceCookie, deviceIdFromRequest, hashDeviceId, newDeviceId } from "../../../../lib/device-auth";
import { googleClientId, pkceChallenge, randomOAuthValue } from "../../../../lib/google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const day = Math.min(7, Math.max(1, Number(url.searchParams.get("day")) || 1));
  const deviceId = deviceIdFromRequest(request) || newDeviceId();
  const deviceIdHash = await hashDeviceId(deviceId);
  const state = randomOAuthValue();
  const codeVerifier = randomOAuthValue(48);
  await getDb().insert(googleOauthStates).values({ state, deviceIdHash, codeVerifier, workoutDay:200 + day, expiresAt:Date.now() + 10 * 60 * 1000 });
  const redirectUri = `${url.origin}/api/google/callback`;
  const params = new URLSearchParams({
    client_id:googleClientId(), redirect_uri:redirectUri, response_type:"code", access_type:"offline", prompt:"consent",
    scope:"openid email https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly", state,
    code_challenge:await pkceChallenge(codeVerifier), code_challenge_method:"S256",
  });
  return new Response(null, { status:302, headers:{ location:`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, "set-cookie":deviceCookie(deviceId, request.url) } });
}
