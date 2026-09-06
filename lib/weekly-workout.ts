export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export type WeekdayName = typeof WEEKDAYS[number];

export type SheetCell = {
  formattedValue?: string;
  effectiveValue?: { stringValue?: string; numberValue?: number };
  hyperlink?: string;
  userEnteredFormat?: { textFormat?: { link?: { uri?: string } } };
  textFormatRuns?: Array<{ format?: { link?: { uri?: string } } }>;
};

export type WeeklyExercise = {
  order: string;
  name: string;
  sets: number;
  reps: number;
  repRange: string;
  load: number;
  unit: "lb" | "body" | "minutes";
  rest: number;
  cue: string;
  bodyLabel?: string;
  videoUrl?: string;
  sheetRow: number;
};

export type WeeklyWorkout = {
  program: "weekly7";
  day: number;
  dayName: WeekdayName;
  type: string;
  focus: string;
  accent: string;
  sheetId: string;
  sheetUrl: string;
  sheetTab: string;
  lastDate: string;
  previousDate?: string;
  nextWeek?: string;
  warmupVideoUrl?: string;
  exercises: WeeklyExercise[];
  cardio: string;
  cardioStatusCell: string;
  notesCell: string;
  repsColumn: string;
  loadColumn: string;
  commentsColumn: string;
};

export type WeeklyCatalogDay = {
  day: number;
  dayName: WeekdayName;
  available: boolean;
  error?: string;
  workout?: WeeklyWorkout;
  continueWeek?: string;
};

export type WeeklySessionCandidate = {
  workoutDay:number;
  sourceSheetId:string;
  sheetTab:string|null;
  status:string;
};

export function attachWeeklyContinuations<T extends WeeklyCatalogDay>(days:T[],sessions:WeeklySessionCandidate[]) {
  return days.map(day=>{
    const workout=day.workout;
    if (!day.available||!workout) return day;
    const session=sessions.find(candidate=>candidate.status==="active"&&candidate.workoutDay===200+day.day&&candidate.sourceSheetId===workout.sheetId&&candidate.sheetTab===workout.sheetTab);
    return session?.sheetTab?{...day,continueWeek:session.sheetTab}:day;
  });
}

export function foundWeeklyDays<T extends {available:boolean;workout?:unknown}>(days:T[]) {
  return days.filter(day=>day.available&&Boolean(day.workout));
}

export function selectWeeklyFile<T extends { name:string }>(files:T[],dayName:WeekdayName) {
  const expected=`workout ${dayName}`.toLowerCase();
  const matches=files.filter(file=>file.name.trim().toLowerCase()===expected);
  if (matches.length>1) throw new Error("Multiple matching sheets found");
  return matches[0];
}

export function selectLatestWeek<T extends { title:string }>(sheets:T[]) {
  return sheets.map(sheet=>({sheet,match:/^Week\s+(\d+)$/i.exec(sheet.title)})).filter((item):item is {sheet:T;match:RegExpExecArray}=>Boolean(item.match)).sort((a,b)=>Number(b.match[1])-Number(a.match[1]))[0]?.sheet;
}

export function workoutDateParts(date:Date) {
  if (Number.isNaN(date.getTime())) throw new Error("Invalid workout date");
  return {
    month:date.toLocaleDateString("en-US",{month:"long",timeZone:"America/Toronto"}),
    day:Number(date.toLocaleDateString("en-CA",{day:"numeric",timeZone:"America/Toronto"})),
    year:Number(date.toLocaleDateString("en-CA",{year:"numeric",timeZone:"America/Toronto"})),
  };
}

export function weeklyWorkoutDateLabel(rows:SheetCell[][]) {
  const month=cellText(rows[1]?.[5]);
  const day=Number(cellText(rows[1]?.[7]));
  const year=Number(cellText(rows[1]?.[8]));
  const monthIndex=["january","february","march","april","may","june","july","august","september","october","november","december"].indexOf(month.toLowerCase());
  if (monthIndex<0||!Number.isInteger(day)||day<1||day>31||!Number.isInteger(year)||year<2000) return undefined;
  return `${month.slice(0,3)} ${day}, ${year}`;
}

export function nextWeeklyTab(sheetTab:string) {
  const match=/^Week\s+(\d+)$/i.exec(sheetTab.trim());
  return match?`Week ${Number(match[1])+1}`:undefined;
}

function cellText(cell?: SheetCell) {
  if (!cell) return "";
  if (cell.formattedValue !== undefined) return String(cell.formattedValue).trim();
  if (cell.effectiveValue?.stringValue !== undefined) return cell.effectiveValue.stringValue.trim();
  if (cell.effectiveValue?.numberValue !== undefined) return String(cell.effectiveValue.numberValue);
  return "";
}

function cellLink(cell?: SheetCell) {
  return cell?.hyperlink || cell?.userEnteredFormat?.textFormat?.link?.uri || cell?.textFormatRuns?.find(run => run.format?.link?.uri)?.format?.link?.uri;
}

function numberFrom(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function targetReps(repRange: string, current: string) {
  const logged = numberFrom(current);
  if (logged > 0) return Math.round(logged);
  const values = repRange.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return Math.round(values.at(-1) || 10);
}

function columnName(index: number) {
  let current = index + 1;
  let value = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
}

function columnIndex(name: string) {
  return name.toUpperCase().split("").reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function validYouTubeUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    return hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtu.be" || hostname === "youtube-nocookie.com" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function youtubeEmbedUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    let id = "";
    if (hostname === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
    else {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0])) id = parts[1] || "";
    }
    if (!/^[A-Za-z0-9_-]{6,}$/.test(id)) return undefined;
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
  } catch {
    return undefined;
  }
}

export function parseWeeklyWorkout(args: {
  day: number;
  dayName: WeekdayName;
  sheetId: string;
  sheetUrl: string;
  sheetTab: string;
  rows: SheetCell[][];
}) {
  const { day, dayName, sheetId, sheetUrl, sheetTab, rows } = args;
  const normalized = (value: string) => value.trim().toLowerCase();
  const headerRowIndex = rows.findIndex(row => {
    const values = row.map(cell => normalized(cellText(cell)));
    return values.includes("order") && values.includes("exercise");
  });
  if (headerRowIndex < 0) throw new Error("Exercise table not found");

  const headers = rows[headerRowIndex].map(cell => normalized(cellText(cell)));
  const orderColumn = headers.indexOf("order");
  const exerciseColumn = headers.indexOf("exercise");
  const cueColumn = headers.findIndex(value => value.includes("cue"));
  const volumeColumn = headers.indexOf("volume");
  const repsColumn = headers.indexOf("reps");
  const loadColumn = headers.indexOf("load");
  const commentsColumn = headers.indexOf("comments");
  const restColumn = headers.indexOf("rest");
  if ([orderColumn, exerciseColumn, volumeColumn, repsColumn, loadColumn, commentsColumn, restColumn].some(index => index < 0)) {
    throw new Error("Required workout columns are missing");
  }

  let warmupVideoUrl: string | undefined;
  for (let rowIndex = 0; rowIndex < headerRowIndex; rowIndex++) {
    for (const cell of rows[rowIndex]) {
      if (normalized(cellText(cell)) === "warm up video") warmupVideoUrl = validYouTubeUrl(cellLink(cell));
    }
  }

  const exercises: WeeklyExercise[] = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const order = cellText(row[orderColumn]);
    const name = cellText(row[exerciseColumn]);
    if (!/^[A-Z]+\d+$/i.test(order) || !name) continue;
    const volume = cellText(row[volumeColumn]);
    const sets = Math.max(1, Math.round(numberFrom(volume.match(/^\s*\d+/)?.[0] || "", 1)));
    const repRange = volume.match(/x\s*(.+)$/i)?.[1]?.trim() || cellText(row[repsColumn]) || "8–12";
    const lowerName = name.toLowerCase();
    const unit = /\bmin(?:ute)?s?\b/i.test(repRange) ? "minutes" : /bodyweight|banded|plank|airplane|sit.?up/i.test(lowerName) ? "body" : "lb";
    exercises.push({
      order,
      name,
      sets,
      reps: targetReps(repRange, cellText(row[repsColumn])),
      repRange,
      load: numberFrom(cellText(row[loadColumn])),
      unit,
      rest: Math.max(0, Math.round(numberFrom(cellText(row[restColumn]), unit === "minutes" ? 0 : 60))),
      cue: cueColumn >= 0 ? cellText(row[cueColumn]) || "Move with control and keep every rep consistent." : "Move with control and keep every rep consistent.",
      bodyLabel: unit === "body" ? "BODYWEIGHT" : undefined,
      videoUrl: validYouTubeUrl(cellLink(row[exerciseColumn])),
      sheetRow: rowIndex + 1,
    });
  }
  if (!exercises.length) throw new Error("No exercises found");

  let cardio = "No cardio instructions provided.";
  let cardioStatusCell = "";
  let notesCell = "";
  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const labelColumn = rows[rowIndex].findIndex(cell => normalized(cellText(cell)) === "cardio");
    if (labelColumn >= 0) {
      let instructionRow = rowIndex + 1;
      while (instructionRow < rows.length && !cellText(rows[instructionRow][labelColumn])) instructionRow++;
      if (instructionRow < rows.length) cardio = cellText(rows[instructionRow][labelColumn]);
      cardioStatusCell = `${columnName(commentsColumn)}${instructionRow + 1}`;
    }
    const notesColumn = rows[rowIndex].findIndex(cell => normalized(cellText(cell)) === "notes / observations");
    if (notesColumn >= 0) notesCell = `${columnName(notesColumn)}${rowIndex + 2}`;
  }
  if (!cardioStatusCell) throw new Error("Cardio section not found");
  if (!notesCell) throw new Error("Notes section not found");

  return {
    program: "weekly7" as const,
    day,
    dayName,
    type: "Workout",
    focus: exercises.slice(0, 3).map(exercise => exercise.name).join(" · "),
    accent: "SHEET PROGRAM",
    sheetId,
    sheetUrl,
    sheetTab,
    lastDate: sheetTab,
    previousDate:weeklyWorkoutDateLabel(rows),
    nextWeek:nextWeeklyTab(sheetTab),
    warmupVideoUrl,
    exercises,
    cardio,
    cardioStatusCell,
    notesCell,
    repsColumn: columnName(repsColumn),
    loadColumn: columnName(loadColumn),
    commentsColumn: columnName(commentsColumn),
  } satisfies WeeklyWorkout;
}

export function readPreviousWeeklySets(workout: WeeklyWorkout, rows: SheetCell[][]) {
  const previous: Array<{ exerciseIndex: number; setNumber: number; reps: number; load: number }> = [];
  const repsIndex = columnIndex(workout.repsColumn);
  const loadIndex = columnIndex(workout.loadColumn);
  for (const [exerciseIndex, exercise] of workout.exercises.entries()) {
    for (let setNumber = 1; setNumber <= exercise.sets; setNumber++) {
      const row = rows[exercise.sheetRow + setNumber - 2] || [];
      const reps = numberFrom(cellText(row[repsIndex]), Number.NaN);
      const load = numberFrom(cellText(row[loadIndex]), Number.NaN);
      if (Number.isFinite(reps) && Number.isFinite(load)) previous.push({ exerciseIndex, setNumber, reps, load });
    }
  }
  return previous;
}
