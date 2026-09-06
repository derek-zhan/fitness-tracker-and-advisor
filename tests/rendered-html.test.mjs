import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers:{ accept:"text/html" } }), { ASSETS:{ fetch:async()=>new Response("Not found",{status:404}) } }, { waitUntil(){}, passThroughOnException(){} });
}

test("server-renders all three workout program tabs", async () => {
  const response=await render();
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/<title>Forge — Guided Workout Log<\/title>/i);
  assert.match(html,/>4 DAYS</);
  assert.match(html,/>6 DAYS</);
  assert.match(html,/>7 DAYS</);
  assert.match(html,/From Sheets/);
  assert.doesNotMatch(html,/Building your site/);
});

test("privacy policy describes weekday file discovery", async () => {
  const response=await render("/privacy");
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/Workout Monday through Workout Sunday/);
  assert.match(html,/read-only access to spreadsheet file names/i);
});
