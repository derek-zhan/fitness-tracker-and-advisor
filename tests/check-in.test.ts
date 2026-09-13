import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { answersForRow, buildCheckInRow, checkInQuestions, checkInRowForDate, CheckInSourceError, nextCheckInWeek, previousCheckInDate, validateCheckInAnswers, weightProgress } from "../lib/check-in.ts";

test("extracts text questions dynamically and omits upload questions",()=>{
  assert.deepEqual(checkInQuestions(["Date","Week","How did it go?","Progress photo (upload)","","Next goal?"]),[
    {column:2,label:"How did it go?"},
    {column:5,label:"Next goal?"},
  ]);
  assert.throws(()=>checkInQuestions(["When","Week","Question"]),(error:unknown)=>error instanceof CheckInSourceError&&error.code==="check_in_headers_invalid");
});

test("finds the current and previous check-in dates and increments the highest week",()=>{
  const rows=[["2026-09-10","Week 2"],["2026-09-03",1],["2026-09-13",3],["not a date",99]];
  assert.deepEqual(checkInRowForDate(rows,"2026-09-13"),rows[2]);
  assert.equal(previousCheckInDate(rows,"2026-09-13"),"2026-09-10");
  assert.equal(nextCheckInWeek(rows),4);
});

test("aligns answers with their source columns and leaves upload columns blank",()=>{
  const headers=["Date","Week","Question 1","Photo upload","Question 2"];
  const questions=checkInQuestions(headers);
  const answers=validateCheckInAnswers(questions,[{...questions[0],value:" Improve sleep "},{...questions[1],value:"Train three times"}]);
  assert.deepEqual(buildCheckInRow(headers,"2026-09-13",4,answers),["2026-09-13",4,"Improve sleep","","Train three times"]);
  assert.deepEqual(answersForRow(questions,["2026-09-13",4,"Saved","","Also saved"]),[{...questions[0],value:"Saved"},{...questions[1],value:"Also saved"}]);
  assert.throws(()=>validateCheckInAnswers(questions,[{...questions[0],value:""},{...questions[1],value:"Done"}]),/Answer every question/);
});

test("selects valid weight entries inclusively between check-ins",()=>{
  const progress=weightProgress([["2026-09-05",160],["2026-09-06",159.5],["2026-09-10",158.2],["2026-09-13",157.8],["2026-09-14",157],["bad",155]],"2026-09-06","2026-09-13");
  assert.deepEqual(progress.points,[{date:"2026-09-06",weight:159.5},{date:"2026-09-10",weight:158.2},{date:"2026-09-13",weight:157.8}]);
  assert.equal(progress.startWeight,159.5);
  assert.equal(progress.endWeight,157.8);
  assert.equal(progress.change,-1.7);
  assert.equal(weightProgress([["2026-09-13",155.5]],null,"2026-09-13").change,null);
});

test("check-in API is authenticated, re-reads the workbook, and appends once",async()=>{
  const route=await readFile(new URL("../app/api/check-in/route.ts",import.meta.url),"utf8");
  const google=await readFile(new URL("../lib/google.ts",import.meta.url),"utf8");
  assert.match(route,/export async function GET/);
  assert.match(route,/export async function POST/);
  assert.match(route,/allowedConnectionForRequest\(request\)/);
  assert.match(route,/check_in_already_completed/);
  assert.match(google,/checkInWorkbookRows\(accessToken\)/);
  assert.match(google,/checkInRowForDate\(rows,date\).*CheckInAlreadyCompletedError/);
  assert.match(google,/insertDataOption=INSERT_ROWS/);
});

test("check-in UI has top-level navigation, a step flow, draft recovery, and weight summary",async()=>{
  const source=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
  assert.match(source,/aria-label="Forge sections"/);
  assert.match(source,/>Check-in<\/button>/);
  assert.match(source,/QUESTION \{checkInStep\+1\} OF/);
  assert.match(source,/forge-active-check-in/);
  assert.match(source,/Finish check-in/);
  assert.match(source,/WEIGHT PROGRESS/);
});
