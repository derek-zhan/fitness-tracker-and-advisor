import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { googleConnections, googleOauthStates } from "../../../../db/schema";
import { encryptToken, googleClientId, googleClientSecret } from "../../../../lib/google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const stateValue = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!stateValue || !code) return Response.redirect(`${url.origin}/?google=denied`, 302);
  const db = getDb();
  const [state] = await db.select().from(googleOauthStates).where(eq(googleOauthStates.state, stateValue)).limit(1);
  if (!state || state.expiresAt < Date.now()) return Response.redirect(`${url.origin}/?google=expired`, 302);
  await db.delete(googleOauthStates).where(eq(googleOauthStates.state, stateValue));
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: googleClientId(), client_secret: googleClientSecret(), redirect_uri: `${url.origin}/api/google/callback`, grant_type: "authorization_code", code_verifier: state.codeVerifier }),
  });
  const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; error_description?: string };
  if (!tokenResponse.ok || !tokens.refresh_token) return Response.redirect(`${url.origin}/?google=failed`, 302);
  let email: string | null = null;
  if (tokens.access_token) {
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` } });
    if (profileResponse.ok) email = ((await profileResponse.json()) as { email?: string }).email || null;
  }
  await db.insert(googleConnections).values({ userId: state.userId, email, encryptedRefreshToken: await encryptToken(tokens.refresh_token) }).onConflictDoUpdate({ target: googleConnections.userId, set: { email, encryptedRefreshToken: await encryptToken(tokens.refresh_token), updatedAt: new Date().toISOString() } });
  return Response.redirect(`${url.origin}/?google=connected&day=${state.workoutDay}`, 302);
}
