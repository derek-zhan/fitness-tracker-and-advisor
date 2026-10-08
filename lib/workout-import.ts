import { WEEKDAYS, type WeekdayName } from "./weekly-workout.ts";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ImportedExercise = {
  order:string;
  name:string;
  sets:number;
  repRange:string;
  targetReps:number;
  defaultLoad:number;
  unit:"lb"|"body"|"minutes";
  restSeconds:number;
  cue:string;
  videoUrl?:string;
};

export type ImportedWorkoutDay = {
  day:number;
  dayName:WeekdayName;
  label:string;
  type:string;
  focus:string;
  warmupVideoUrl?:string;
  cardio:string;
  exercises:ImportedExercise[];
};

export type ImportedWorkoutPlan = {
  name:string;
  normalizedName:string;
  days:ImportedWorkoutDay[];
};

type RawExercise = {
  order?:unknown;
  name?:unknown;
  sets?:unknown;
  repRange?:unknown;
  targetReps?:unknown;
  defaultLoad?:unknown;
  unit?:unknown;
  restSeconds?:unknown;
  cue?:unknown;
  videoUrl?:unknown;
};

type RawDay = {
  dayNumber?:unknown;
  dayLabel?:unknown;
  workoutType?:unknown;
  focus?:unknown;
  warmupVideoUrl?:unknown;
  cardio?:unknown;
  exercises?:unknown;
};

const workoutPlanSchema = {
  type:"object",
  additionalProperties:false,
  properties:{
    planName:{type:"string"},
    days:{
      type:"array",minItems:1,maxItems:7,
      items:{
        type:"object",additionalProperties:false,
        properties:{
          dayNumber:{type:"integer",minimum:1,maximum:7},
          dayLabel:{type:"string"},
          workoutType:{type:"string"},
          focus:{type:"string"},
          warmupVideoUrl:{type:["string","null"]},
          cardio:{type:["string","null"]},
          exercises:{
            type:"array",minItems:1,maxItems:30,
            items:{
              type:"object",additionalProperties:false,
              properties:{
                order:{type:["string","null"]},
                name:{type:"string"},
                sets:{type:"integer",minimum:1,maximum:20},
                repRange:{type:["string","null"]},
                targetReps:{type:["integer","null"],minimum:0,maximum:10000},
                defaultLoad:{type:["number","null"],minimum:0,maximum:100000},
                unit:{type:"string",enum:["lb","body","minutes"]},
                restSeconds:{type:["integer","null"],minimum:0,maximum:3600},
                cue:{type:["string","null"]},
                videoUrl:{type:["string","null"]},
              },
              required:["order","name","sets","repRange","targetReps","defaultLoad","unit","restSeconds","cue","videoUrl"],
            },
          },
        },
        required:["dayNumber","dayLabel","workoutType","focus","warmupVideoUrl","cardio","exercises"],
      },
    },
  },
  required:["planName","days"],
} as const;

export class WorkoutImportError extends Error {
  readonly code:string;
  readonly status:number;

  constructor(message:string,code="workout_import_error",status=400) {
    super(message);
    this.code=code;
    this.status=status;
  }
}

function cleanText(value:unknown,maxLength=240) {
  return typeof value==="string"?value.replace(/\p{Cc}/gu," ").replace(/\s+/g," ").trim().slice(0,maxLength):"";
}

function filenameStem(filename:string) {
  return filename.replace(/\.[^.]+$/,"" ).trim() || "Imported Workout";
}

export function normalizeWorkoutName(value:string) {
  const name=cleanText(value,80).replace(/[\\/:*?"<>|]/g,"-").replace(/\.+$/g,"").trim();
  return name || "Imported Workout";
}

function numberValue(value:unknown,fallback:number,min:number,max:number) {
  if (value===null||value===undefined||value==="") return fallback;
  const parsed=typeof value==="number"?value:Number(value);
  return Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):fallback;
}

function targetFromRange(value:string) {
  const numbers=value.match(/\d+(?:\.\d+)?/g)?.map(Number)||[];
  return Math.round(numbers.at(-1)||10);
}

function youtubeUrl(value:unknown) {
  const text=cleanText(value,500);
  if (!text) return undefined;
  try {
    const url=new URL(text);
    const host=url.hostname.replace(/^www\./,"").toLowerCase();
    return ["youtube.com","m.youtube.com","youtu.be","youtube-nocookie.com"].includes(host)?text:undefined;
  } catch { return undefined; }
}

function exerciseOrder(value:unknown,index:number) {
  const order=cleanText(value,16).toUpperCase();
  return /^[A-Z]+\d+$/.test(order)?order:`A${index+1}`;
}

export function normalizeImportedWorkoutPlan(raw:unknown,sourceFilename:string):ImportedWorkoutPlan {
  if (!raw||typeof raw!=="object") throw new WorkoutImportError("The workout plan could not be understood","invalid_workout_plan");
  const value=raw as {planName?:unknown;days?:unknown};
  if (!Array.isArray(value.days)||value.days.length<1||value.days.length>7) throw new WorkoutImportError("The document must contain between one and seven workout days","invalid_workout_days");
  const usedDays=new Set<number>();
  const days=value.days.map((untyped,index)=>{
    const day=untyped as RawDay;
    const dayNumber=Math.round(numberValue(day.dayNumber,index+1,1,7));
    if (usedDays.has(dayNumber)) throw new WorkoutImportError(`More than one workout was assigned to ${WEEKDAYS[dayNumber-1]}`,"duplicate_workout_day");
    usedDays.add(dayNumber);
    if (!Array.isArray(day.exercises)||!day.exercises.length) throw new WorkoutImportError(`${WEEKDAYS[dayNumber-1]} does not contain any exercises`,"empty_workout_day");
    if (day.exercises.length>30) throw new WorkoutImportError(`${WEEKDAYS[dayNumber-1]} contains too many exercises`,"invalid_workout_day");
    const exercises=day.exercises.map((untypedExercise,exerciseIndex)=>{
      const exercise=untypedExercise as RawExercise;
      const name=cleanText(exercise.name,120);
      if (!name) throw new WorkoutImportError(`${WEEKDAYS[dayNumber-1]} contains an exercise without a name`,"invalid_exercise");
      const repRange=cleanText(exercise.repRange,40)||"8-10";
      return {
        order:exerciseOrder(exercise.order,exerciseIndex),
        name,
        sets:Math.round(numberValue(exercise.sets,1,1,20)),
        repRange,
        targetReps:Math.round(numberValue(exercise.targetReps,targetFromRange(repRange),0,10000)),
        defaultLoad:numberValue(exercise.defaultLoad,0,0,100000),
        unit:["body","minutes"].includes(String(exercise.unit))?exercise.unit as "body"|"minutes":"lb",
        restSeconds:Math.round(numberValue(exercise.restSeconds,60,0,3600)),
        cue:cleanText(exercise.cue,300)||"Move with control and keep every rep consistent.",
        videoUrl:youtubeUrl(exercise.videoUrl),
      } satisfies ImportedExercise;
    });
    const dayName=WEEKDAYS[dayNumber-1];
    return {
      day:dayNumber,
      dayName,
      label:cleanText(day.dayLabel,60)||dayName,
      type:cleanText(day.workoutType,80)||"Workout",
      focus:cleanText(day.focus,180)||exercises.slice(0,3).map(item=>item.name).join(" · "),
      warmupVideoUrl:youtubeUrl(day.warmupVideoUrl),
      cardio:cleanText(day.cardio,500)||"No cardio instructions provided.",
      exercises,
    } satisfies ImportedWorkoutDay;
  }).sort((a,b)=>a.day-b.day);
  const name=normalizeWorkoutName(cleanText(value.planName,80)||filenameStem(sourceFilename));
  return {name,normalizedName:name.toLocaleLowerCase("en-US"),days};
}

function bytesToBase64(bytes:Uint8Array) {
  let result="";
  const chunkSize=0x8000;
  for (let offset=0;offset<bytes.length;offset+=chunkSize) result+=String.fromCharCode(...bytes.subarray(offset,offset+chunkSize));
  return btoa(result);
}

function outputText(data:unknown) {
  const response=data as {output?:Array<{content?:Array<{type?:string;text?:string}>}>};
  return (response.output||[]).flatMap(item=>item.content||[]).find(item=>item.type==="output_text")?.text;
}

export function validateWorkoutImportFile(file:File) {
  const extension=file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  const mime=file.type|| (extension===".pdf"?PDF_MIME:extension===".docx"?DOCX_MIME:"");
  if (![".pdf",".docx"].includes(extension||"")||![PDF_MIME,DOCX_MIME].includes(mime)) throw new WorkoutImportError("Choose a PDF or Word (.docx) workout plan","unsupported_file_type",415);
  if (!file.size) throw new WorkoutImportError("The uploaded file is empty","empty_upload");
  if (file.size>MAX_UPLOAD_BYTES) throw new WorkoutImportError("Workout plan files must be 10 MB or smaller","upload_too_large",413);
  return mime;
}

export async function extractWorkoutPlan(file:File) {
  const mime=validateWorkoutImportFile(file);
  const {env}=await import("cloudflare:workers");
  const workerEnv=env as unknown as Record<string,string|undefined>;
  const apiKey=workerEnv.OPENAI_API_KEY;
  if (!apiKey) throw new WorkoutImportError("Workout importing is not configured","import_not_configured",503);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const fileInput:{type:string;filename:string;file_data:string;detail?:string}={type:"input_file",filename:file.name,file_data:`data:${mime};base64,${bytesToBase64(bytes)}`};
  if (mime===PDF_MIME) fileInput.detail="high";
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},
    body:JSON.stringify({
      model:workerEnv.OPENAI_WORKOUT_IMPORT_MODEL||"gpt-6-astra",
      instructions:"Extract the workout plan exactly as written. Preserve explicit weekdays. Map numbered Day 1 through Day 7 to Monday through Sunday. Do not create missing days, exercises, cardio, loads, cues, or links. Only return YouTube URLs that are explicitly present. Use null for optional values that are not stated.",
      input:[{role:"user",content:[fileInput,{type:"input_text",text:"Extract this document into the workout plan schema."}]}],
      text:{format:{type:"json_schema",name:"workout_plan",strict:true,schema:workoutPlanSchema}},
    }),
  });
  const data=await response.json() as {error?:{message?:string}};
  if (!response.ok) throw new WorkoutImportError(data.error?.message||"The workout plan could not be processed","openai_import_failed",502);
  const text=outputText(data);
  if (!text) throw new WorkoutImportError("The workout plan did not contain readable workout details","empty_model_output",422);
  try { return normalizeImportedWorkoutPlan(JSON.parse(text),file.name); }
  catch (error) {
    if (error instanceof WorkoutImportError) throw error;
    throw new WorkoutImportError("The extracted workout plan was invalid","invalid_model_output",422);
  }
}

export function workoutSheetRows(day:ImportedWorkoutDay) {
  const rows:(string|number)[][]=[
    ["","Workout"],
    ["","Warm Up Video","","","","Month","","Day","Year"],
    ["","Order","Exercise","Quick Cues","Volume","Reps","Load","Comments","Rest"],
  ];
  for (const exercise of day.exercises) {
    const prescribed=exercise.unit==="lb"&&exercise.defaultLoad>0?` @ ${exercise.defaultLoad} lb`:"";
    rows.push(["",exercise.order,exercise.name,exercise.cue,`${exercise.sets} x ${exercise.repRange}${prescribed}`,"","","",`${exercise.restSeconds}s`]);
    for (let set=1;set<exercise.sets;set++) rows.push(["","","","","","","","",""]);
  }
  rows.push(["","Cardio"],["",day.cardio],["","Notes / Observations"],[""]);
  return rows;
}

export const WORKOUT_IMPORT_MAX_BYTES=MAX_UPLOAD_BYTES;
export const WORKOUT_IMPORT_MIME_TYPES={pdf:PDF_MIME,docx:DOCX_MIME} as const;
