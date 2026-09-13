import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasWeightRecordForDate, selectWeightCheckInFile, sheetDateKey, torontoDateKey, validateWeight, WeightCheckInSourceError } from "../lib/weight-check-in.ts";

test("uses the Toronto calendar date around the UTC boundary",()=>{
  assert.equal(torontoDateKey(new Date("2026-09-13T03:30:00.000Z")),"2026-09-12");
  assert.equal(torontoDateKey(new Date("2026-09-13T04:30:00.000Z")),"2026-09-13");
});

test("normalizes ISO, formatted, and Google serial dates",()=>{
  const serial=(Date.UTC(2026,8,13)-Date.UTC(1899,11,30))/86400000;
  assert.equal(sheetDateKey("2026-09-13"),"2026-09-13");
  assert.equal(sheetDateKey("September 13, 2026"),"2026-09-13");
  assert.equal(sheetDateKey(serial),"2026-09-13");
});

test("detects only a record for the requested date",()=>{
  assert.equal(hasWeightRecordForDate([["2026-09-12",180],["2026-09-13",179.5]],"2026-09-13"),true);
  assert.equal(hasWeightRecordForDate([["2026-09-12",180]],"2026-09-13"),false);
});

test("selects exactly one Workout Check-in spreadsheet",()=>{
  assert.deepEqual(selectWeightCheckInFile([{id:"one",name:"Workout Check-in"}]),{id:"one",name:"Workout Check-in"});
  assert.throws(()=>selectWeightCheckInFile([]),(error:unknown)=>error instanceof WeightCheckInSourceError&&error.code==="weight_spreadsheet_not_found");
  assert.throws(()=>selectWeightCheckInFile([{id:"one",name:"Workout Check-in"},{id:"two",name:" workout check-in "}]),(error:unknown)=>error instanceof WeightCheckInSourceError&&error.code==="weight_spreadsheet_ambiguous");
});

test("accepts positive numeric weights and rejects invalid values",()=>{
  assert.equal(validateWeight(179.5),179.5);
  assert.throws(()=>validateWeight(0),/greater than zero/);
  assert.throws(()=>validateWeight("179.5"),/greater than zero/);
  assert.throws(()=>validateWeight(Number.NaN),/greater than zero/);
});

test("Google integration creates and initializes Weight before appending",async()=>{
  const source=await readFile(new URL("../lib/google.ts",import.meta.url),"utf8");

  assert.match(source,/addSheet:\{properties:\{title:WEIGHT_CHECK_IN_TAB/);
  assert.match(source,/values:\[\["Date","Weight \(lb\)"\]\]/);
  assert.match(source,/hasWeightRecordForDate\(rows,date\).*WeightAlreadyCheckedInError/);
  assert.match(source,/insertDataOption=INSERT_ROWS/);
});

test("API protects status and save operations with device Google authentication",async()=>{
  const source=await readFile(new URL("../app/api/weight-check-in/route.ts",import.meta.url),"utf8");

  assert.match(source,/export async function GET/);
  assert.match(source,/export async function POST/);
  assert.match(source,/allowedConnectionForRequest\(request\)/);
  assert.match(source,/google_reauthorize_required/);
  assert.match(source,/weight_already_checked_in/);
  assert.match(source,/invalid_weight/);
});
