import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { workoutPlanDays, workoutPlans } from "../../../../db/schema";
import { allowedConnectionForRequest } from "../../../../lib/device-auth";
import { accessTokenForDevice, GoogleReauthorizationRequiredError, hasWorkoutImportScope, provisionImportedWorkoutPlan, trashDriveFile, workoutPlanFolderNameExists } from "../../../../lib/google";
import { extractWorkoutPlan, validateWorkoutImportFile, WorkoutImportError } from "../../../../lib/workout-import";

function planLinks(plan:{id:string;name:string;driveFolderId:string|null;sourceFileId:string|null},days:Array<{day:number;dayName:string;sourceSheetId:string}>) {
  return {
    id:plan.id,
    name:plan.name,
    folderUrl:plan.driveFolderId?`https://drive.google.com/drive/folders/${plan.driveFolderId}`:"",
    sourceUrl:plan.sourceFileId?`https://drive.google.com/file/d/${plan.sourceFileId}/view`:"",
    days:days.map(day=>({day:day.day,dayName:day.dayName,sheetUrl:`https://docs.google.com/spreadsheets/d/${day.sourceSheetId}/edit`})),
  };
}

export async function POST(request:Request) {
  const identity=await allowedConnectionForRequest(request);
  if (!identity.connection||!identity.deviceIdHash) return Response.json({error:"Connect Google before importing a workout plan",code:"google_auth_required"},{status:401});
  if (!hasWorkoutImportScope(identity.connection.grantedScopes)) return Response.json({error:"Reconnect Google once to allow workout file creation",code:"google_reauthorize_required"},{status:403});
  let accessToken="";
  let folderId="";
  let planId="";
  try {
    accessToken=await accessTokenForDevice(identity.deviceIdHash)||"";
    if (!accessToken) return Response.json({error:"Reconnect Google before importing a workout plan",code:"google_auth_required"},{status:401});
    const form=await request.formData();
    const upload=form.get("file");
    if (!(upload instanceof File)) throw new WorkoutImportError("Choose a PDF or Word workout plan","missing_upload");
    const sourceMimeType=validateWorkoutImportFile(upload);
    const requestId=String(form.get("requestId")||crypto.randomUUID()).trim().slice(0,100);
    if (!requestId) throw new WorkoutImportError("Missing import request identifier","missing_request_id");
    const ownerEmail=identity.connection.email.trim().toLowerCase();
    const db=getDb();
    const [idempotent]=await db.select().from(workoutPlans).where(eq(workoutPlans.importRequestId,requestId)).limit(1);
    if (idempotent) {
      if (idempotent.ownerEmail!==ownerEmail) throw new WorkoutImportError("That import request belongs to another account","import_not_allowed",403);
      if (idempotent.status==="complete") {
        const days=await db.select().from(workoutPlanDays).where(eq(workoutPlanDays.planId,idempotent.id)).orderBy(workoutPlanDays.day);
        return Response.json({plan:planLinks(idempotent,days)});
      }
      if (idempotent.status==="provisioning") throw new WorkoutImportError("This workout plan is already being imported","import_in_progress",409);
    }
    const extracted=await extractWorkoutPlan(upload);
    const [sameName]=await db.select().from(workoutPlans).where(and(eq(workoutPlans.ownerEmail,ownerEmail),eq(workoutPlans.normalizedName,extracted.normalizedName))).limit(1);
    if (sameName&&sameName.status!=="failed") throw new WorkoutImportError("A workout plan with this name already exists. Rename it in the source document and try again.","duplicate_workout_name",409);
    if (await workoutPlanFolderNameExists(accessToken,extracted.name)) throw new WorkoutImportError("A folder with this workout name already exists in Forge. Rename the workout and try again.","duplicate_workout_folder",409);
    const reusable=idempotent?.status==="failed"?idempotent:sameName;
    planId=reusable?.id||crypto.randomUUID();
    if (reusable) {
      await db.delete(workoutPlanDays).where(eq(workoutPlanDays.planId,reusable.id));
      await db.update(workoutPlans).set({ownerEmail,name:extracted.name,normalizedName:extracted.normalizedName,sourceFileName:upload.name,sourceMimeType,importRequestId:requestId,status:"provisioning",driveFolderId:null,sourceFileId:null,error:null,updatedAt:new Date().toISOString()}).where(eq(workoutPlans.id,reusable.id));
    } else {
      await db.insert(workoutPlans).values({id:planId,ownerEmail,name:extracted.name,normalizedName:extracted.normalizedName,sourceFileName:upload.name,sourceMimeType,importRequestId:requestId,status:"provisioning"});
    }
    const created=await provisionImportedWorkoutPlan(accessToken,extracted,upload);
    folderId=created.folder.id;
    await db.insert(workoutPlanDays).values(created.days.map(day=>({planId,day:day.day,dayName:day.dayName,sourceSheetId:day.id})));
    await db.update(workoutPlans).set({status:"complete",driveFolderId:created.folder.id,sourceFileId:created.source.id,error:null,updatedAt:new Date().toISOString()}).where(eq(workoutPlans.id,planId));
    return Response.json({plan:{id:planId,name:extracted.name,folderUrl:created.folder.webViewLink,sourceUrl:created.source.webViewLink,days:created.days.map(day=>({day:day.day,dayName:day.dayName,sheetUrl:day.webViewLink}))}},{status:201});
  } catch (error) {
    if (folderId&&accessToken) try { await trashDriveFile(accessToken,folderId); } catch { /* best-effort cleanup */ }
    if (planId) {
      const db=getDb();
      await db.delete(workoutPlanDays).where(eq(workoutPlanDays.planId,planId));
      await db.update(workoutPlans).set({status:"failed",driveFolderId:null,sourceFileId:null,error:error instanceof Error?error.message:"Import failed",updatedAt:new Date().toISOString()}).where(eq(workoutPlans.id,planId));
    }
    if (error instanceof GoogleReauthorizationRequiredError) return Response.json({error:"Reconnect Google before importing a workout plan",code:"google_reauthorize_required"},{status:401});
    if (error instanceof WorkoutImportError) return Response.json({error:error.message,code:error.code},{status:error.status});
    const message=error instanceof Error?error.message:"The workout plan could not be imported";
    const conflict=/unique constraint/i.test(message);
    return Response.json({error:conflict?"A workout plan with this name already exists":message,code:conflict?"duplicate_workout_name":"workout_import_failed"},{status:conflict?409:500});
  }
}
