import assert from "node:assert/strict";
import test from "node:test";
import { foundWeeklyDays, nextWeeklyTab, parseWeeklyWorkout, selectLatestWeek, selectWeeklyFile, weeklyWorkoutDateLabel, workoutDateParts, youtubeEmbedUrl, type SheetCell } from "../lib/weekly-workout.ts";

const value=(formattedValue:string,hyperlink?:string):SheetCell=>({formattedValue,...(hyperlink?{hyperlink}:{})});

test("parses the verified Week tab structure and write locations",()=>{
  const rows:SheetCell[][]=[
    [value(""),value("Workout")],
    [value(""),value("Warm Up Video","https://youtu.be/VqGVoVn7xjA"),value(""),value(""),value(""),value("September"),value(""),value("5"),value("2026")],
    [value(""),value("Order"),value("Exercise"),value("Quick Cues"),value("Volume"),value("Reps"),value("Load"),value("Comments"),value("Rest")],
    [value(""),value("A1"),value("Dumbbell Press","https://www.youtube.com/watch?v=VmB1G1K7v94"),value("Control every rep"),value("4 x 8 - 10"),value("10"),value("50"),value(""),value("90s")],
    [value(""),value(""),value(""),value(""),value(""),value("9"),value("50")],
    [],[],[],[],
    [value(""),value("B1"),value("Plank","https://www.youtube.com/shorts/abcDEF_1234"),value("Brace"),value("3 x 30"),value(""),value(""),value(""),value("30s")],
    [],[],[],[],[],
    [value(""),value("Cardio")],
    [value(""),value("10 min incline walk")],
    [value(""),value("Notes / Observations")],
  ];
  const workout=parseWeeklyWorkout({day:1,dayName:"Monday",sheetId:"sheet",sheetUrl:"https://example.com",sheetTab:"Week 2",rows});
  assert.equal(workout.warmupVideoUrl,"https://youtu.be/VqGVoVn7xjA");
  assert.equal(workout.exercises.length,2);
  assert.equal(workout.exercises[0].order,"A1");
  assert.equal(workout.exercises[0].sets,4);
  assert.equal(workout.exercises[0].reps,10);
  assert.equal(workout.exercises[0].repRange,"8 - 10");
  assert.equal(workout.exercises[0].load,50);
  assert.equal(workout.exercises[0].rest,90);
  assert.equal(workout.exercises[0].sheetRow,4);
  assert.equal(workout.exercises[1].unit,"body");
  assert.equal(workout.cardio,"10 min incline walk");
  assert.equal(workout.cardioStatusCell,"H17");
  assert.equal(workout.notesCell,"B19");
  assert.equal(workout.repsColumn,"F");
  assert.equal(workout.loadColumn,"G");
  assert.equal(workout.previousDate,"Sep 5, 2026");
  assert.equal(workout.nextWeek,"Week 3");
});

test("supports watch, Shorts, youtu.be, and missing YouTube links",()=>{
  assert.match(youtubeEmbedUrl("https://www.youtube.com/watch?v=VmB1G1K7v94")||"",/\/embed\/VmB1G1K7v94/);
  assert.match(youtubeEmbedUrl("https://youtube.com/shorts/YZKFk1n0aYY")||"",/\/embed\/YZKFk1n0aYY/);
  assert.match(youtubeEmbedUrl("https://youtu.be/VqGVoVn7xjA")||"",/\/embed\/VqGVoVn7xjA/);
  assert.equal(youtubeEmbedUrl("https://example.com/video"),undefined);
  assert.equal(youtubeEmbedUrl(undefined),undefined);
});

test("rejects malformed workout tabs",()=>{
  assert.throws(()=>parseWeeklyWorkout({day:2,dayName:"Tuesday",sheetId:"sheet",sheetUrl:"https://example.com",sheetTab:"Week 1",rows:[[value("Nothing here")]]}),/Exercise table not found/);
});

test("matches exact weekday files and selects the highest numbered Week tab",()=>{
  const monday=selectWeeklyFile([{name:"Workout Monday",id:"one"},{name:"Monday Workout",id:"two"}],"Monday");
  assert.equal(monday?.id,"one");
  assert.equal(selectWeeklyFile([{name:"Workout Tuesday"}],"Monday"),undefined);
  assert.throws(()=>selectWeeklyFile([{name:"Workout Monday"},{name:" workout monday "}],"Monday"),/Multiple matching sheets/);
  assert.equal(selectLatestWeek([{title:"Notes"},{title:"week 2"},{title:"Week 11"}])?.title,"Week 11");
});

test("formats the weekly workout start date in Toronto time",()=>{
  assert.deepEqual(workoutDateParts(new Date("2026-09-06T01:30:00.000Z")),{month:"September",day:5,year:2026});
  assert.throws(()=>workoutDateParts(new Date("invalid")),/Invalid workout date/);
});

test("omits an invalid or empty previous workout date",()=>{
  assert.equal(weeklyWorkoutDateLabel([[],[]]),undefined);
  assert.equal(weeklyWorkoutDateLabel([[],[value(""),value(""),value(""),value(""),value(""),value("Month"),value(""),value("Day"),value("Year")]]),undefined);
});

test("shows the next Week tab that will be created",()=>{
  assert.equal(nextWeeklyTab("Week 2"),"Week 3");
  assert.equal(nextWeeklyTab("week 11"),"Week 12");
  assert.equal(nextWeeklyTab("Workout Log"),undefined);
});

test("shows only weekly sheets that were found and parsed",()=>{
  const days=foundWeeklyDays([
    {day:1,available:true,workout:{sheetTab:"Week 2"}},
    {day:2,available:false},
    {day:3,available:true},
  ]);
  assert.deepEqual(days.map(item=>item.day),[1]);
});
