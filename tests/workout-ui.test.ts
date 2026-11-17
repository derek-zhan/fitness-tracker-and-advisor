import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("finishing from the button serializes the logged set count, not the click event", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /async function finishWorkout\(\)/);
  assert.match(source, /totalSets:logs\.length/);
  assert.doesNotMatch(source, /async function finishWorkout\(totalLogged/);
});

test("the final-stage finish action stays in the top action stack", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const finalStage = source.match(/stage==="finish"[^\n]+/)?.[0] ?? "";

  assert.match(finalStage, /className="workout-title-actions"[^]*className="finish-button finish-submit-button"/);
  assert.match(finalStage, /className="finish-button finish-submit-button" onClick=\{finishWorkout\}/);
  assert.doesNotMatch(finalStage, /className="notes-block"[^]*className="primary-action"/);
});

test("the local workout preview can reach and finish the review flow without Google", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /if\(previewMode\)\{setSessionId\("local-preview-session"\)[^]*setStage\("warmup"\)[^]*setView\("workout"\)/);
  assert.match(source, /async function finishWorkout\(\)[^]*if\(previewMode\)\{[^]*setView\("summary"\)/);
});

test("an active workout can add and restore extra rounds up to six sets", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/workouts/route.ts", import.meta.url), "utf8");

  assert.match(source, /className="add-round"[^>]*>\+<\/button>/);
  assert.match(source, /visibleSetCount<MAX_SETS_PER_EXERCISE/);
  assert.match(source, /matchingDraft\.setNumber<=MAX_SETS_PER_EXERCISE/);
  assert.match(route, /payload\.setNumber > MAX_SETS_PER_EXERCISE/);
});

test("home offers a labeled daily weight check-in dialog", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, />⚖️<\/span><b>Weight Check-in<\/b>/);
  assert.match(source, /className="hero-kicker-row"[^]*YOUR LIVE 7-DAY PROGRAM[^]*Weight Check-in/);
  assert.match(source, /view==="checkin"&&weightCheckInState==="ready"/);
  assert.doesNotMatch(source, /\(view==="home"\|\|view==="checkin"\)&&weightCheckInState==="ready"/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /type="number" inputMode="decimal" min="0\.1" step="0\.1"/);
  assert.match(source, /fetch\("\/api\/weight-check-in"/);
});

test("home highlights the workout matching the visitor's current weekday", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /function currentWorkoutDay\(now=new Date\(\)\)\{return now\.getDay\(\)\|\|7\}/);
  assert.match(source, /const isToday=currentDay===item\.day/);
  assert.match(source, /isToday\?"current-day":""/);
  assert.match(source, /isToday\?"TODAY":item\.workout!\.accent/);
  assert.match(styles, /\.program-weekly7 \.day-card\.current-day\{/);
});
