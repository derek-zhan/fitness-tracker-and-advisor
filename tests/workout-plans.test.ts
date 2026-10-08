import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("OAuth records the narrow Drive file scope for imports",async()=>{
  const google=await readFile(new URL("../lib/google.ts",import.meta.url),"utf8");
  const callback=await readFile(new URL("../app/api/google/callback/route.ts",import.meta.url),"utf8");
  const status=await readFile(new URL("../app/api/google/status/route.ts",import.meta.url),"utf8");
  assert.match(google,/https:\/\/www\.googleapis\.com\/auth\/drive\.file/);
  assert.match(callback,/grantedScopes/);
  assert.match(status,/canImportWorkouts:hasWorkoutImportScope/);
});

test("imported workout catalogs and starts are resolved by plan ownership",async()=>{
  const plans=await readFile(new URL("../lib/workout-plans.ts",import.meta.url),"utf8");
  const weekly=await readFile(new URL("../app/api/workouts/weekly/route.ts",import.meta.url),"utf8");
  const workouts=await readFile(new URL("../app/api/workouts/route.ts",import.meta.url),"utf8");
  assert.match(plans,/eq\(workoutPlans\.ownerEmail,ownerEmail\.trim\(\)\.toLowerCase\(\)\)/);
  assert.match(plans,/eq\(workoutPlans\.status,"complete"\)/);
  assert.match(weekly,/workoutCatalogForPlan\(accessToken,identity\.connection\?\.email/);
  assert.match(workouts,/payload\.planId\|\|LEGACY_WORKOUT_PLAN_ID/);
  assert.doesNotMatch(workouts,/payload\.sheetId/);
});

test("Drive provisioning creates and verifies the expected workout artifacts",async()=>{
  const google=await readFile(new URL("../lib/google.ts",import.meta.url),"utf8");
  assert.match(google,/name:`Workout \$\{day\.dayName\}`/);
  assert.match(google,/title:"Week 1"/);
  assert.match(google,/googleMultipartJson/);
  assert.match(google,/await parseWeeklyFile/);
  assert.match(google,/await trashDriveFile\(accessToken,folder\.id\)/);
});
