"use client";

export type { GoogleSheetRef, ImportedExercise, ImportedWorkout } from "./google-sheet-parser";

import type { GoogleSheetRef, ImportedExercise, ImportedWorkout } from "./google-sheet-parser";

async function apiJson<T>(url:string,init?:RequestInit){
  const response=await fetch(url,init);const data=await response.json() as T&{error?:string};
  if(!response.ok)throw new Error(data.error||"Google Sheets could not be reached.");
  return data;
}

export async function listGoogleSheets(){return apiJson<{sheets:GoogleSheetRef[]}>("/api/google/sheets")}

export async function importWorkoutSheet(sheet:GoogleSheetRef){
  const params=new URLSearchParams({sheetId:sheet.id,name:sheet.name,url:sheet.url});
  return (await apiJson<{workouts:ImportedWorkout[]}>(`/api/google/import?${params.toString()}`)).workouts;
}

export async function writeImportedSet(args:{sheet:GoogleSheetRef;workout:ImportedWorkout;exercise:ImportedExercise;setNumber:number;reps:number;load:number}){
  return apiJson<{saved:true}>("/api/google/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(args)});
}
