import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { googleConnections } from "../db/schema";
import { parseWeeklyWorkout, readPreviousWeeklySets, selectLatestWeek, selectWeeklyFile, WEEKDAYS, workoutDateParts, type SheetCell, type WeeklyCatalogDay, type WeeklyWorkout } from "./weekly-workout";

const workerEnv = env as unknown as Record<string, string | undefined>;

function required(name: string) {
  const value = workerEnv[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function base64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function encryptionKey() {
  return crypto.subtle.importKey("raw", base64ToBytes(required("GOOGLE_TOKEN_ENCRYPTION_KEY")), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(token)));
  return `${bytesToBase64(iv)}.${bytesToBase64(encrypted)}`;
}

export async function decryptToken(value: string) {
  const [iv, encrypted] = value.split(".");
  if (!iv || !encrypted) throw new Error("Invalid encrypted Google token");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await encryptionKey(), base64ToBytes(encrypted));
  return new TextDecoder().decode(decrypted);
}

export function randomOAuthValue(size = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function pkceChallenge(verifier: string) {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

export function googleClientId() { return required("GOOGLE_CLIENT_ID"); }
export function googleClientSecret() { return required("GOOGLE_CLIENT_SECRET"); }

export class GoogleReauthorizationRequiredError extends Error {}

export async function accessTokenForDevice(deviceIdHash: string) {
  const db = getDb();
  const [connection] = await db.select().from(googleConnections).where(eq(googleConnections.deviceIdHash, deviceIdHash)).limit(1);
  if (!connection) return null;
  const refreshToken = await decryptToken(connection.encryptedRefreshToken);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: googleClientId(), client_secret: googleClientSecret(), refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new GoogleReauthorizationRequiredError(data.error_description || "Google authorization expired");
  return data.access_token;
}

async function googleJson(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const apiError = data.error as { message?: string } | undefined;
    throw new Error(apiError?.message || "Google Sheets update failed");
  }
  return data;
}

function quotedSheet(sheetTab: string) {
  return `'${sheetTab.replace(/'/g, "''")}'`;
}

type WeeklyFile = { id:string; name:string; webViewLink?:string };

export async function listWeeklyWorkoutFiles(accessToken:string) {
  const query = "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and name contains 'Workout'";
  const params = new URLSearchParams({ q:query, fields:"files(id,name,webViewLink,modifiedTime)", pageSize:"100", orderBy:"modifiedTime desc" });
  const data = await googleJson(`https://www.googleapis.com/drive/v3/files?${params.toString()}`,accessToken) as {files?:WeeklyFile[]};
  return data.files || [];
}

async function weeklySheetMetadata(accessToken:string,spreadsheetId:string) {
  return googleJson(`${sheetApi(spreadsheetId)}?fields=properties.title,sheets.properties(sheetId,title,index)`,accessToken) as Promise<{properties?:{title?:string};sheets?:Array<{properties?:{sheetId?:number;title?:string;index?:number}}>}>;
}

async function readWeeklySheetRows(accessToken:string,spreadsheetId:string,sheetTab:string) {
  const params = new URLSearchParams({ includeGridData:"true", ranges:`${quotedSheet(sheetTab)}!A1:I250`, fields:"sheets(data(rowData(values(formattedValue,effectiveValue,hyperlink,userEnteredFormat(textFormat(link)),textFormatRuns(format(link))))))" });
  const data = await googleJson(`${sheetApi(spreadsheetId)}?${params.toString()}`,accessToken) as {sheets?:Array<{data?:Array<{rowData?:Array<{values?:SheetCell[]}>}>}>};
  return (data.sheets?.[0]?.data?.[0]?.rowData || []).map(row => row.values || []);
}

function latestWeek(metadata:Awaited<ReturnType<typeof weeklySheetMetadata>>) {
  return selectLatestWeek((metadata.sheets || []).map(sheet => {
    const title = sheet.properties?.title || "";
    const match = /^Week\s+(\d+)$/i.exec(title);
    return match && sheet.properties?.sheetId !== undefined ? { title, number:Number(match[1]), sheetId:sheet.properties.sheetId, index:sheet.properties.index || 0 } : null;
  }).filter((item):item is {title:string;number:number;sheetId:number;index:number} => Boolean(item)));
}

async function parseWeeklyFile(accessToken:string,file:WeeklyFile,day:number,sheetTab?:string) {
  const dayName = WEEKDAYS[day-1];
  if (!dayName) throw new Error("Invalid weekday");
  const metadata = await weeklySheetMetadata(accessToken,file.id);
  const week = sheetTab ? (metadata.sheets || []).map(sheet => ({ title:sheet.properties?.title || "", sheetId:sheet.properties?.sheetId })).find(sheet => sheet.title === sheetTab) : latestWeek(metadata);
  if (!week?.title) throw new Error(sheetTab ? `${sheetTab} was not found` : "No Week tab found");
  const rows = await readWeeklySheetRows(accessToken,file.id,week.title);
  const workout = parseWeeklyWorkout({ day, dayName, sheetId:file.id, sheetUrl:file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`, sheetTab:week.title, rows });
  return { workout, rows, metadata, week };
}

function fileForDay(files:WeeklyFile[],day:number) {
  const dayName = WEEKDAYS[day-1];
  if (!dayName) return undefined;
  return selectWeeklyFile(files,dayName);
}

export async function readWeeklyWorkoutCatalog(accessToken:string):Promise<WeeklyCatalogDay[]> {
  const files = await listWeeklyWorkoutFiles(accessToken);
  return Promise.all(WEEKDAYS.map(async (dayName,index) => {
    const day=index+1;
    try {
      const file=fileForDay(files,day);
      if (!file) return { day,dayName,available:false,error:"Sheet not found" };
      const {workout}=await parseWeeklyFile(accessToken,file,day);
      return {day,dayName,available:true,workout};
    } catch (error) {
      return {day,dayName,available:false,error:error instanceof Error?error.message:"Sheet could not be read"};
    }
  }));
}

export async function resumeWeeklyWorkout(accessToken:string,spreadsheetId:string,sheetTab:string,day:number) {
  const metadata=await weeklySheetMetadata(accessToken,spreadsheetId);
  const file:WeeklyFile={id:spreadsheetId,name:metadata.properties?.title || `Workout ${WEEKDAYS[day-1]}`,webViewLink:`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`};
  return parseWeeklyFile(accessToken,file,day,sheetTab);
}

export async function readPreviousWeeklyWorkoutSets(accessToken:string,workout:WeeklyWorkout) {
  const match=/^Week\s+(\d+)$/i.exec(workout.sheetTab);
  if (!match || Number(match[1])<=1) return [];
  try {
    const previous=await resumeWeeklyWorkout(accessToken,workout.sheetId,`Week ${Number(match[1])-1}`,workout.day);
    return readPreviousWeeklySets(previous.workout,previous.rows);
  } catch {
    return [];
  }
}

export async function writeWeeklyWorkoutDate(accessToken:string,spreadsheetId:string,sheetTab:string,date:Date) {
  const {month,day,year}=workoutDateParts(date);
  const tab=quotedSheet(sheetTab);
  await googleJson(`${sheetApi(spreadsheetId,"/values:batchUpdate")}`,accessToken,{method:"POST",body:JSON.stringify({valueInputOption:"USER_ENTERED",data:[
    {range:`${tab}!F2`,values:[[month]]},
    {range:`${tab}!H2`,values:[[day]]},
    {range:`${tab}!I2`,values:[[year]]},
  ]})});
}

export async function createWeeklyWorkout(accessToken:string,day:number,date:Date) {
  const files=await listWeeklyWorkoutFiles(accessToken);
  const file=fileForDay(files,day);
  if (!file) throw new Error(`${WEEKDAYS[day-1]} workout sheet was not found`);
  const parsed=await parseWeeklyFile(accessToken,file,day);
  const current=latestWeek(parsed.metadata);
  if (!current) throw new Error("No Week tab found");
  const title=`Week ${current.number+1}`;
  await googleJson(`${sheetApi(file.id,":batchUpdate")}`,accessToken,{method:"POST",body:JSON.stringify({requests:[{duplicateSheet:{sourceSheetId:current.sheetId,insertSheetIndex:current.index+1,newSheetName:title}}]})});
  await writeWeeklyWorkoutDate(accessToken,file.id,title,date);
  const previousSets=readPreviousWeeklySets(parsed.workout,parsed.rows);
  const ranges=parsed.workout.exercises.map(exercise => `${quotedSheet(title)}!${parsed.workout.repsColumn}${exercise.sheetRow}:${parsed.workout.commentsColumn}${exercise.sheetRow+exercise.sets-1}`);
  ranges.push(`${quotedSheet(title)}!${parsed.workout.cardioStatusCell}`,`${quotedSheet(title)}!${parsed.workout.notesCell}`);
  await googleJson(`${sheetApi(file.id,"/values:batchClear")}`,accessToken,{method:"POST",body:JSON.stringify({ranges})});
  const created=await parseWeeklyFile(accessToken,file,day,title);
  return {workout:created.workout,previousSets};
}

export async function writeWeeklyWorkoutSet(accessToken:string,workout:WeeklyWorkout,exerciseOrder:string,exerciseName:string,setNumber:number,reps:number,load:number) {
  const source=await resumeWeeklyWorkout(accessToken,workout.sheetId,workout.sheetTab,workout.day);
  const exercise=source.workout.exercises.find(item => item.order===exerciseOrder && item.name===exerciseName);
  if (!exercise || setNumber<1 || setNumber>exercise.sets) throw new Error("Exercise set was not found in the workout sheet");
  const row=exercise.sheetRow+setNumber-1;
  const range=encodeURIComponent(`${quotedSheet(workout.sheetTab)}!${source.workout.repsColumn}${row}:${source.workout.loadColumn}${row}`);
  await googleJson(`${sheetApi(workout.sheetId,`/values/${range}`)}?valueInputOption=USER_ENTERED`,accessToken,{method:"PUT",body:JSON.stringify({values:[[reps,load]]})});
}

export async function finishWeeklyWorkout(accessToken:string,workout:WeeklyWorkout,cardioCompleted:boolean,notes:string) {
  const source=await resumeWeeklyWorkout(accessToken,workout.sheetId,workout.sheetTab,workout.day);
  const tab=quotedSheet(workout.sheetTab);
  await googleJson(`${sheetApi(workout.sheetId,"/values:batchUpdate")}`,accessToken,{method:"POST",body:JSON.stringify({valueInputOption:"USER_ENTERED",data:[
    {range:`${tab}!${source.workout.cardioStatusCell}`,values:[[cardioCompleted?"Completed":"Skipped"]]},
    {range:`${tab}!${source.workout.notesCell}`,values:[[notes.trim()]]},
  ]})});
}

function sheetApi(spreadsheetId: string, suffix = "") {
  return `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}${suffix}`;
}

export type PreviousWorkoutSet = { exerciseIndex: number; setNumber: number; reps: number; load: number };

export async function sheetTabExists(accessToken: string, spreadsheetId: string, sheetTab: string) {
  const metadata = await googleJson(`${sheetApi(spreadsheetId)}?fields=sheets.properties.title`, accessToken) as { sheets?: Array<{ properties?: { title?: string } }> };
  return (metadata.sheets || []).some((sheet) => sheet.properties?.title === sheetTab);
}

export async function readPreviousWorkoutSets(accessToken: string, spreadsheetId: string, sheetTab: string, exerciseSets: number[]) {
  if (!exerciseSets.length) return [];
  const lastRow = 5 + (exerciseSets.length - 1) * 6 + Math.max(0, exerciseSets.at(-1)! - 1);
  const quoted = `'${sheetTab.replace(/'/g, "''")}'`;
  const range = encodeURIComponent(`${quoted}!F5:G${lastRow}`);
  const data = await googleJson(`${sheetApi(spreadsheetId, `/values/${range}`)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`, accessToken) as { values?: unknown[][] };
  const rows = data.values || [];
  const previousSets: PreviousWorkoutSet[] = [];
  exerciseSets.forEach((setCount, exerciseIndex) => {
    const startRowOffset = exerciseIndex * 6;
    for (let setNumber = 1; setNumber <= setCount; setNumber++) {
      const [repsValue, loadValue] = rows[startRowOffset + setNumber - 1] || [];
      const reps = Number(repsValue);
      const load = Number(loadValue);
      const hasReps = repsValue !== undefined && repsValue !== null && repsValue !== "";
      const hasLoad = loadValue !== undefined && loadValue !== null && loadValue !== "";
      if (hasReps && hasLoad && Number.isFinite(reps) && Number.isFinite(load)) {
        previousSets.push({ exerciseIndex, setNumber, reps, load });
      }
    }
  });
  return previousSets;
}

export async function readPreviousWeekWorkoutSets(accessToken: string, spreadsheetId: string, currentSheetTab: string, exerciseSets: number[]) {
  const match = /^Week\s+(\d+)$/i.exec(currentSheetTab);
  if (!match || Number(match[1]) <= 1) return [];
  const currentWeek = Number(match[1]);
  const metadata = await googleJson(`${sheetApi(spreadsheetId)}?fields=sheets.properties.title`, accessToken) as { sheets?: Array<{ properties?: { title?: string } }> };
  const previousWeek = (metadata.sheets || []).map((sheet) => {
    const title = sheet.properties?.title || "";
    const weekMatch = /^Week\s+(\d+)$/i.exec(title);
    return weekMatch ? { number:Number(weekMatch[1]), title } : null;
  }).filter((week): week is { number:number; title:string } => week !== null && week.number < currentWeek).sort((a,b) => b.number - a.number)[0];
  if (!previousWeek) return [];
  return readPreviousWorkoutSets(accessToken, spreadsheetId, previousWeek.title, exerciseSets);
}

export async function createWorkoutWeek(accessToken: string, spreadsheetId: string, date: Date, exerciseSets: number[]) {
  const metadata = await googleJson(`${sheetApi(spreadsheetId)}?fields=sheets.properties`, accessToken) as { sheets?: Array<{ properties?: { sheetId?: number; title?: string; index?: number } }> };
  const weeks = (metadata.sheets || []).map((sheet) => {
    const title = sheet.properties?.title || "";
    const match = /^Week\s+(\d+)$/i.exec(title);
    return match && sheet.properties?.sheetId !== undefined ? { number: Number(match[1]), id: sheet.properties.sheetId, index: sheet.properties.index || 0 } : null;
  }).filter((item): item is { number: number; id: number; index: number } => Boolean(item)).sort((a, b) => b.number - a.number);
  if (!weeks.length) throw new Error("No Week tab was found in this workout sheet");
  const latest = weeks[0];
  const previousSets = await readPreviousWorkoutSets(accessToken, spreadsheetId, `Week ${latest.number}`, exerciseSets);
  const title = `Week ${latest.number + 1}`;
  await googleJson(`${sheetApi(spreadsheetId, ":batchUpdate")}`, accessToken, { method: "POST", body: JSON.stringify({ requests: [{ duplicateSheet: { sourceSheetId: latest.id, insertSheetIndex: latest.index + 1, newSheetName: title } }] }) });
  const quoted = `'${title.replace(/'/g, "''")}'`;
  const month = date.toLocaleDateString("en-US", { month: "long", timeZone: "America/Toronto" });
  const day = Number(date.toLocaleDateString("en-CA", { day: "numeric", timeZone: "America/Toronto" }));
  const year = Number(date.toLocaleDateString("en-CA", { year: "numeric", timeZone: "America/Toronto" }));
  await googleJson(`${sheetApi(spreadsheetId, "/values:batchUpdate")}`, accessToken, { method: "POST", body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: [
    { range: `${quoted}!F2`, values: [[month]] }, { range: `${quoted}!H2`, values: [[day]] }, { range: `${quoted}!I2`, values: [[year]] },
  ] }) });
  const ranges = exerciseSets.map((sets, index) => { const row = 5 + index * 6; return `${quoted}!F${row}:H${row + sets - 1}`; });
  await googleJson(`${sheetApi(spreadsheetId, "/values:batchClear")}`, accessToken, { method: "POST", body: JSON.stringify({ ranges }) });
  return { sheetTab:title, previousSets };
}

export async function writeWorkoutSet(accessToken: string, spreadsheetId: string, sheetTab: string, exerciseIndex: number, setNumber: number, reps: number, load: number) {
  const row = 5 + exerciseIndex * 6 + setNumber - 1;
  const quoted = `'${sheetTab.replace(/'/g, "''")}'`;
  await googleJson(`${sheetApi(spreadsheetId, "/values:batchUpdate")}`, accessToken, { method: "POST", body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: [
    { range: `${quoted}!F${row}:G${row}`, values: [[reps, load]] },
  ] }) });
}

export async function ensureWorkoutLogSheet(accessToken: string, spreadsheetId: string) {
  const metadata = await googleJson(`${sheetApi(spreadsheetId)}?fields=sheets.properties`, accessToken) as { sheets?: Array<{ properties?: { title?: string } }> };
  if ((metadata.sheets || []).some((sheet) => sheet.properties?.title === "Workout Log")) return "Workout Log";
  await googleJson(`${sheetApi(spreadsheetId, ":batchUpdate")}`, accessToken, { method:"POST", body:JSON.stringify({ requests:[{ addSheet:{ properties:{ title:"Workout Log", gridProperties:{ frozenRowCount:1, hideGridlines:true } } } }] }) });
  await googleJson(`${sheetApi(spreadsheetId, "/values:batchUpdate")}`, accessToken, { method:"POST", body:JSON.stringify({ valueInputOption:"USER_ENTERED", data:[{ range:"'Workout Log'!A1:I1", values:[["Date","Program","Day","Type","Exercise","Set","Reps / Minutes","Load (lb)","Notes"]] }] }) });
  return "Workout Log";
}

export async function appendWorkoutSet(accessToken: string, spreadsheetId: string, values: Array<string|number>) {
  const range=encodeURIComponent("'Workout Log'!A:I");
  await googleJson(`${sheetApi(spreadsheetId, `/values/${range}:append`)}?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, accessToken, { method:"POST", body:JSON.stringify({ values:[values] }) });
}

function sheetDateKey(value:unknown) {
  if (typeof value === "number") return new Date(Date.UTC(1899,11,30)+value*86400000).toISOString().slice(0,10);
  const text=String(value??"");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed=Date.parse(text);
  return Number.isNaN(parsed)?text:new Date(parsed).toISOString().slice(0,10);
}

export async function upsertWorkoutSetLog(accessToken: string, spreadsheetId: string, values: Array<string|number>) {
  const lookupRange=encodeURIComponent("'Workout Log'!A2:H");
  const data=await googleJson(`${sheetApi(spreadsheetId, `/values/${lookupRange}`)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`, accessToken) as { values?: unknown[][] };
  const matchingRows=(data.values||[]).map((row,index)=>({row,index:index+2})).filter(({row})=>sheetDateKey(row[0])===sheetDateKey(values[0])&&String(row[1]??"")===String(values[1]??"")&&String(row[2]??"")===String(values[2]??"")&&String(row[4]??"")===String(values[4]??"")&&Number(row[5])===Number(values[5]));
  if (!matchingRows.length) {
    await appendWorkoutSet(accessToken,spreadsheetId,values);
    return;
  }
  const ranges=matchingRows.map(({index})=>({range:`'Workout Log'!A${index}:I${index}`,values:[values]}));
  await googleJson(`${sheetApi(spreadsheetId, "/values:batchUpdate")}`, accessToken, { method:"POST", body:JSON.stringify({ valueInputOption:"USER_ENTERED", data:ranges }) });
}
