import assert from "node:assert/strict";
import test from "node:test";
import { normalizeImportedWorkoutPlan, normalizeWorkoutName, WorkoutImportError, workoutSheetRows } from "../lib/workout-import.ts";
import { parseWeeklyWorkout, type SheetCell } from "../lib/weekly-workout.ts";

const rawPlan={
  planName:"  Strength / Builder  ",
  days:[{
    dayNumber:1,dayLabel:"Day 1",workoutType:"Upper Body",focus:"Press and pull",warmupVideoUrl:null,cardio:null,
    exercises:[{order:null,name:"Dumbbell Press",sets:3,repRange:"8-10",targetReps:null,defaultLoad:50,unit:"lb",restSeconds:null,cue:null,videoUrl:"https://example.com/not-youtube"}],
  }],
};

test("normalizes extracted workout defaults without inventing days or links",()=>{
  const plan=normalizeImportedWorkoutPlan(rawPlan,"fallback.pdf");
  assert.equal(plan.name,"Strength - Builder");
  assert.equal(plan.normalizedName,"strength - builder");
  assert.deepEqual(plan.days.map(day=>day.dayName),["Monday"]);
  assert.equal(plan.days[0].cardio,"No cardio instructions provided.");
  assert.equal(plan.days[0].exercises[0].order,"A1");
  assert.equal(plan.days[0].exercises[0].targetReps,10);
  assert.equal(plan.days[0].exercises[0].restSeconds,60);
  assert.equal(plan.days[0].exercises[0].videoUrl,undefined);
});

test("rejects duplicate weekday assignments and invalid day counts",()=>{
  assert.throws(()=>normalizeImportedWorkoutPlan({...rawPlan,days:[rawPlan.days[0],rawPlan.days[0]]},"plan.pdf"),(error:unknown)=>error instanceof WorkoutImportError&&error.code==="duplicate_workout_day");
  assert.throws(()=>normalizeImportedWorkoutPlan({...rawPlan,days:[]},"plan.pdf"),(error:unknown)=>error instanceof WorkoutImportError&&error.code==="invalid_workout_days");
  assert.throws(()=>normalizeImportedWorkoutPlan({...rawPlan,days:Array.from({length:8},(_,index)=>({...rawPlan.days[0],dayNumber:index+1}))},"plan.pdf"),(error:unknown)=>error instanceof WorkoutImportError&&error.code==="invalid_workout_days");
});

test("sanitizes Drive folder names and falls back to the source filename",()=>{
  assert.equal(normalizeWorkoutName("Plan: A/B*"),"Plan- A-B-");
  assert.equal(normalizeImportedWorkoutPlan({...rawPlan,planName:""},"Coach Plan.docx").name,"Coach Plan");
});

test("builds an exact Week 1 layout that the existing parser can read",()=>{
  const plan=normalizeImportedWorkoutPlan(rawPlan,"plan.pdf");
  const rows=workoutSheetRows(plan.days[0]).map(row=>row.map(value=>({formattedValue:String(value)} satisfies SheetCell)));
  const workout=parseWeeklyWorkout({day:1,dayName:"Monday",sheetId:"sheet",sheetUrl:"https://example.com",sheetTab:"Week 1",rows});
  assert.equal(workout.exercises.length,1);
  assert.equal(workout.exercises[0].sets,3);
  assert.equal(workout.exercises[0].repRange,"8-10");
  assert.equal(workout.exercises[0].load,50);
  assert.equal(workout.cardio,"No cardio instructions provided.");
  assert.equal(workout.cardioStatusCell,"H8");
  assert.equal(workout.notesCell,"B10");
});
