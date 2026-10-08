import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { workoutPlanDays, workoutPlans } from "../db/schema";
import { readWeeklyWorkoutCatalog } from "./google";

export const LEGACY_WORKOUT_PLAN_ID="legacy";

export async function importedWorkoutPlanForEmail(ownerEmail:string,planId:string) {
  const db=getDb();
  const [plan]=await db.select().from(workoutPlans).where(and(eq(workoutPlans.id,planId),eq(workoutPlans.ownerEmail,ownerEmail.trim().toLowerCase()),eq(workoutPlans.status,"complete"))).limit(1);
  if (!plan) return null;
  const days=await db.select().from(workoutPlanDays).where(eq(workoutPlanDays.planId,plan.id)).orderBy(workoutPlanDays.day);
  return {plan,days};
}

export async function workoutCatalogForPlan(accessToken:string,ownerEmail:string,planId:string) {
  if (!planId||planId===LEGACY_WORKOUT_PLAN_ID) return readWeeklyWorkoutCatalog(accessToken);
  const imported=await importedWorkoutPlanForEmail(ownerEmail,planId);
  if (!imported) return null;
  const files=imported.days.map(day=>({id:day.sourceSheetId,name:`Workout ${day.dayName}`,webViewLink:`https://docs.google.com/spreadsheets/d/${day.sourceSheetId}/edit`}));
  return readWeeklyWorkoutCatalog(accessToken,files);
}

export async function workoutSheetForPlanDay(accessToken:string,ownerEmail:string,planId:string,day:number) {
  if (!planId||planId===LEGACY_WORKOUT_PLAN_ID) {
    const entry=(await readWeeklyWorkoutCatalog(accessToken))[day-1];
    return entry?.available&&entry.workout?entry.workout.sheetId:null;
  }
  const imported=await importedWorkoutPlanForEmail(ownerEmail,planId);
  return imported?.days.find(item=>item.day===day)?.sourceSheetId||null;
}
