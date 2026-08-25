import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { googleOauthStates } from "../../../../db/schema";
import { googleClientId, pkceChallenge, randomOAuthValue } from "../../../../lib/google";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Please sign in to the workout site first" }, { status: 401 });
  const url = new URL(request.url);
  const workoutDay = Math.min(4, Math.max(1, Number(url.searchParams.get("day")) || 1));
  const state = randomOAuthValue();
  const codeVerifier = randomOAuthValue(48);
  await getDb().insert(googleOauthStates).values({ state, userId: user.userId, codeVerifier, workoutDay, expiresAt: Date.now() + 10 * 60 * 1000 });
  const redirectUri = `${url.origin}/api/google/callback`;
  const params = new URLSearchParams({
    client_id: googleClientId(), redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent",
    scope: "openid email https://www.googleapis.com/auth/spreadsheets", state,
    code_challenge: await pkceChallenge(codeVerifier), code_challenge_method: "S256",
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
}
