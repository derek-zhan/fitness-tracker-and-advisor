import { getChatGPTUser } from "../../../chatgpt-auth";
import { accessTokenForUser, ensureWorkoutLogSheet, readSheetValues, readSpreadsheetMetadata, upsertWorkoutSetLog, writeSheetValues } from "../../../../lib/google";
import { GoogleSheetRef, ImportedExercise, ImportedWorkout, parseSchedule, parseWeeklyTemplate } from "../../../../lib/google-sheet-parser";

async function googleAccess(){
  const user=await getChatGPTUser();if(!user)return null;
  const accessToken=await accessTokenForUser(user.userId);return accessToken?{user,accessToken}:null;
}

export async function GET(request:Request){
  const access=await googleAccess();if(!access)return Response.json({error:"Connect Google before importing a workout."},{status:401});
  const url=new URL(request.url);const sheetId=url.searchParams.get("sheetId")||"";const name=url.searchParams.get("name")||"Google Sheet";const sheetUrl=url.searchParams.get("url")||`https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
  if(!/^[a-zA-Z0-9_-]{20,}$/.test(sheetId))return Response.json({error:"Choose a valid Google Sheet."},{status:400});
  try{
    const sheet:GoogleSheetRef={id:sheetId,name,url:sheetUrl};const metadata=await readSpreadsheetMetadata(access.accessToken,sheetId);const title=metadata.properties?.title||name;const tabs=(metadata.sheets||[]).map(item=>item.properties?.title).filter((value):value is string=>Boolean(value));
    const workouts=tabs.includes("Schedule")?parseSchedule(sheet,await readSheetValues(access.accessToken,sheetId,"Schedule","A1:M250")):(()=>{const latest=tabs.map(tab=>({tab,week:Number(tab.match(/^Week\s+(\d+)$/i)?.[1])})).filter(item=>Number.isFinite(item.week)).sort((a,b)=>b.week-a.week)[0];return latest?latest:null})();
    if(Array.isArray(workouts))return Response.json({workouts});
    if(!workouts)return Response.json({error:"Use a sheet with a Schedule tab or Week-numbered tabs."},{status:400});
    return Response.json({workouts:parseWeeklyTemplate(sheet,title,workouts.tab,await readSheetValues(access.accessToken,sheetId,workouts.tab,"A1:K250"))});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"This spreadsheet could not be imported."},{status:400})}
}

type SavePayload={sheet:GoogleSheetRef;workout:ImportedWorkout;exercise:ImportedExercise;setNumber:number;reps:number;load:number};

export async function POST(request:Request){
  const access=await googleAccess();if(!access)return Response.json({error:"Reconnect Google before saving this set."},{status:401});
  const payload=await request.json() as SavePayload;const {sheet,workout,exercise}=payload;const setNumber=Math.round(Number(payload.setNumber));const reps=Number(payload.reps);const load=Number(payload.load);
  if(!sheet?.id||sheet.id!==workout?.sheetId||!Number.isFinite(setNumber)||setNumber<1||!Number.isFinite(reps)||!Number.isFinite(load))return Response.json({error:"This set could not be validated."},{status:400});
  try{
    if(workout.writeMode==="cells"){
      const row=exercise.writeRows?.[setNumber-1];if(!row||row<1)throw new Error("Forge could not locate this set in the selected sheet.");
      await writeSheetValues(access.accessToken,sheet.id,workout.sourceSheetName,`F${row}:G${row}`,[[reps,load]]);
    }else{
      await ensureWorkoutLogSheet(access.accessToken,sheet.id);
      await upsertWorkoutSetLog(access.accessToken,sheet.id,[new Date().toISOString().slice(0,10),sheet.name,workout.dayName||`Day ${workout.day}`,workout.type,exercise.name,setNumber,reps,load,""]);
    }
    return Response.json({saved:true});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"This set could not be saved."},{status:400})}
}
