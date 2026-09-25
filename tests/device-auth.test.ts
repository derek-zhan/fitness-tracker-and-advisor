import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isOwnerGoogleEmail, ownerWorkouts } from "../lib/owner-workouts.ts";

test("public client contains no personal sheet ids or browser-readable OAuth tokens", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /1CxsM|1oDeg|1xUr|1LO8|1wdtWB/);
  assert.doesNotMatch(source, /refreshToken|accessToken|encryptedRefreshToken/);
  assert.match(source, /forge-active-workout/);
});

test("personal four-day and six-day programs are restricted to the owner email", async () => {
  assert.equal(isOwnerGoogleEmail("ZHANHANGSKY@gmail.com"), true);
  assert.equal(isOwnerGoogleEmail("someone@gmail.com"), false);
  assert.equal(ownerWorkouts.filter((workout) => workout.program === "strength4").length, 4);
  assert.equal(ownerWorkouts.filter((workout) => workout.program === "glute6").length, 6);
  const route = await readFile(new URL("../app/api/workouts/personal/route.ts", import.meta.url), "utf8");
  assert.match(route, /isOwnerGoogleEmail\(identity\.connection\.email\)/);
  assert.match(route, /status:403/);
});

test("personal workouts without weekday names use a numbered day label", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /function workoutDayLabel\(workout:Workout\)\{return workout\.dayName\|\|`Day \$\{workout\.day\}`\}/);
  assert.doesNotMatch(source, /workout\.dayName\.toUpperCase\(\)/);
});

test("device cookie remains server-only and OAuth state is device-bound", async () => {
  const deviceAuth = await readFile(new URL("../lib/device-auth.ts", import.meta.url), "utf8");
  const authorize = await readFile(new URL("../app/api/google/authorize/route.ts", import.meta.url), "utf8");
  const callback = await readFile(new URL("../app/api/google/callback/route.ts", import.meta.url), "utf8");
  assert.match(deviceAuth, /HttpOnly; SameSite=Lax/);
  assert.match(deviceAuth, /SHA-256/);
  assert.match(authorize, /deviceIdHash/);
  assert.match(callback, /state\.deviceIdHash !== await hashDeviceId\(deviceId\)/);
  assert.match(callback, /email_verified !== true/);
  assert.doesNotMatch(deviceAuth, /ALLOWED_GOOGLE_EMAILS|isAllowedGoogleEmail/);
  assert.doesNotMatch(callback, /ALLOWED_GOOGLE_EMAILS|isGoogleEmailAllowed|not_allowed/);
});
