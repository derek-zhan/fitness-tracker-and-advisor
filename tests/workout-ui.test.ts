import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("finishing from the button serializes the logged set count, not the click event", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /async function finishWorkout\(\)/);
  assert.match(source, /totalSets:logs\.length/);
  assert.doesNotMatch(source, /async function finishWorkout\(totalLogged/);
});
