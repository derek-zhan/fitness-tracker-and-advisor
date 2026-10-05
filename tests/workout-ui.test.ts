import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("finishing from the button serializes the logged set count, not the click event", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /async function finishWorkout\(\)/);
  assert.match(source, /totalSets:logs\.length/);
  assert.doesNotMatch(source, /async function finishWorkout\(totalLogged/);
});

test("home offers a labeled daily weight check-in dialog", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, />⚖️<\/span><b>Weight Check-in<\/b>/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /type="number" inputMode="decimal" min="0\.1" step="0\.1"/);
  assert.match(source, /fetch\("\/api\/weight-check-in"/);
});

test("home imports PDF or Word plans and only shows plan tabs for multiple plans",async()=>{
  const source=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
  assert.match(source,/accept="\.pdf,\.docx/);
  assert.match(source,/plans\.length>1\?<div className="plan-tabs"/);
  assert.match(source,/fetch\("\/api\/workout-plans\/import"/);
  assert.match(source,/planId:selectedPlanId/);
  assert.match(source,/📥.*Import/);
  assert.match(source,/aria-label="Reconnect Google to import a workout plan"/);
});
