import type { PickedGoogleSheet } from "./google-picker-client";

export type ImportedExercise = {
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
  writeRows?: number[];
};

export type ImportedWorkout = {
  program: "imported";
  day: number;
  dayName?: string;
  type: string;
  focus: string;
  accent: string;
  sheetId: string;
  sheetUrl: string;
  lastDate: string;
  exercises: ImportedExercise[];
  sourceSheetName: string;
  writeMode: "cells" | "append";
};

type SpreadsheetMetadata = {
  properties?: { title?: string };
  sheets?: Array<{ properties?: { title?: string; index?: number } }>;
};

function sheetRange(sheetName: string, range: string) {
  return `'${sheetName.replaceAll("'", "''")}'!${range}`;
}

async function googleJson<T>(url: string, token: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "Google Sheets could not be read.");
  return data;
}

async function readRange(sheet: PickedGoogleSheet, sheetName: string, range: string) {
  const a1 = encodeURIComponent(sheetRange(sheetName, range));
  const data = await googleJson<{ values?: unknown[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}/values/${a1}?valueRenderOption=FORMATTED_VALUE`,
    sheet.accessToken,
  );
  return data.values || [];
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function number(value: unknown, fallback = 0) {
  const parsed = Number.parseFloat(text(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function targetReps(repRange: string, current: unknown) {
  const logged = number(current);
  if (logged > 0) return logged;
  const values = repRange.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return values.length ? values.at(-1)! : 10;
}

function parseRest(value: unknown, fallback: number) {
  const parsed = number(value);
  return parsed > 0 ? parsed : fallback;
}

function parseWeeklyTemplate(sheet: PickedGoogleSheet, title: string, tabName: string, rows: unknown[][]): ImportedWorkout[] {
  const headerIndex = rows.findIndex(row => row.some(value => text(value).toLowerCase() === "order") && row.some(value => text(value).toLowerCase() === "exercise"));
  if (headerIndex < 0) throw new Error("Forge could not find the exercise table in this spreadsheet.");
  const headers = rows[headerIndex].map(value => text(value).toLowerCase());
  const orderColumn = headers.indexOf("order");
  const exerciseColumn = headers.indexOf("exercise");
  const cueColumn = headers.findIndex(value => value.includes("cue"));
  const volumeColumn = headers.indexOf("volume");
  const repsColumn = headers.indexOf("reps");
  const loadColumn = headers.indexOf("load");
  const restColumn = headers.indexOf("rest");
  const exercises: ImportedExercise[] = [];

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const order = text(row[orderColumn]);
    const name = text(row[exerciseColumn]);
    if (!order || !name || !/^[A-Z]+\d+$/i.test(order)) continue;
    const volume = text(row[volumeColumn]);
    const sets = Math.max(1, Math.round(number(volume.match(/^\d+/)?.[0], 1)));
    const repRange = volume.match(/x\s*(.+)$/i)?.[1]?.trim() || text(row[repsColumn]) || "8–12";
    const writeRows = Array.from({ length: sets }, (_, index) => rowIndex + index + 1);
    const lowerName = name.toLowerCase();
    const unit = lowerName.includes("stair") || /min/i.test(repRange) ? "minutes" : /bodyweight|plank|sit up/i.test(lowerName) ? "body" : "lb";
    exercises.push({
      order,
      name,
      sets,
      reps: targetReps(repRange, row[repsColumn]),
      repRange,
      load: number(row[loadColumn]),
      unit,
      rest: parseRest(row[restColumn], 90),
      cue: text(row[cueColumn]) || "Move with control and keep every rep consistent.",
      bodyLabel: unit === "body" ? "BODYWEIGHT" : undefined,
      writeRows,
    });
  }

  if (!exercises.length) throw new Error("No exercises were found in this spreadsheet.");
  const type = /lower/i.test(title) ? "Lower" : /upper/i.test(title) ? "Upper" : "Workout";
  const originalDay = Math.max(1, Math.round(number(title.match(/day\s*(\d+)/i)?.[1], 1)));
  return [{
    program: "imported",
    day: originalDay,
    type,
    focus: exercises.slice(0, 3).map(exercise => exercise.name).join(" · "),
    accent: "IMPORTED PLAN",
    sheetId: sheet.id,
    sheetUrl: sheet.url,
    lastDate: tabName,
    exercises,
    sourceSheetName: tabName,
    writeMode: "cells",
  }];
}

function parseSchedule(sheet: PickedGoogleSheet, rows: unknown[][]): ImportedWorkout[] {
  const headerIndex = rows.findIndex(row => row.some(value => text(value).toLowerCase() === "day") && row.some(value => text(value).toLowerCase() === "exercise"));
  if (headerIndex < 0) throw new Error("Forge could not find Day and Exercise columns in this spreadsheet.");
  const headers = rows[headerIndex].map(value => text(value).toLowerCase());
  const dayColumn = headers.indexOf("day");
  const typeColumn = headers.indexOf("type");
  const exerciseColumn = headers.indexOf("exercise");
  const setsColumn = headers.indexOf("sets");
  const repsColumn = headers.indexOf("reps");
  const loadColumn = headers.findIndex(value => value.includes("load"));
  const notesColumn = headers.indexOf("notes");
  const groups = new Map<string, { type: string; exercises: ImportedExercise[] }>();

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const dayName = text(row[dayColumn]);
    const name = text(row[exerciseColumn]);
    if (!dayName || !name) continue;
    const type = text(row[typeColumn]) || "Workout";
    const repRange = text(row[repsColumn]) || "8–12";
    const lowerName = name.toLowerCase();
    const unit = lowerName.includes("stair") || /min/i.test(repRange) ? "minutes" : /bodyweight|banded|airplane/i.test(lowerName) ? "body" : "lb";
    const group = groups.get(dayName) || { type, exercises: [] };
    group.exercises.push({
      order: `${String.fromCharCode(65 + group.exercises.length)}1`,
      name,
      sets: Math.max(1, Math.round(number(row[setsColumn], 1))),
      reps: targetReps(repRange, null),
      repRange,
      load: number(row[loadColumn]),
      unit,
      rest: unit === "minutes" ? 0 : type.toLowerCase() === "heavy" ? 90 : 45,
      cue: text(row[notesColumn]) || "Move with control and finish every rep with good form.",
      bodyLabel: unit === "body" ? "BODYWEIGHT" : undefined,
    });
    groups.set(dayName, group);
  }

  const workouts = [...groups.entries()].map(([dayName, group], index): ImportedWorkout => ({
    program: "imported",
    day: index + 1,
    dayName,
    type: group.type,
    focus: group.exercises.slice(0, 3).map(exercise => exercise.name).join(" · "),
    accent: "IMPORTED PLAN",
    sheetId: sheet.id,
    sheetUrl: sheet.url,
    lastDate: "Ready",
    exercises: group.exercises,
    sourceSheetName: "Workout Log",
    writeMode: "append",
  }));
  if (!workouts.length) throw new Error("No workout days were found in this spreadsheet.");
  return workouts;
}

export async function importWorkoutSheet(sheet: PickedGoogleSheet) {
  const metadata = await googleJson<SpreadsheetMetadata>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}?fields=properties.title,sheets.properties(title,index)`,
    sheet.accessToken,
  );
  const title = metadata.properties?.title || sheet.name;
  const tabs = (metadata.sheets || []).map(item => item.properties?.title).filter((value): value is string => Boolean(value));
  if (tabs.includes("Schedule")) return parseSchedule(sheet, await readRange(sheet, "Schedule", "A1:M250"));
  const latestWeek = tabs.map(name => ({ name, week: Number(name.match(/^Week\s+(\d+)$/i)?.[1]) })).filter(item => Number.isFinite(item.week)).sort((a, b) => b.week - a.week)[0];
  if (!latestWeek) throw new Error("Use a sheet with a Schedule tab or Week-numbered tabs.");
  return parseWeeklyTemplate(sheet, title, latestWeek.name, await readRange(sheet, latestWeek.name, "A1:K250"));
}

async function ensureWorkoutLog(sheet: PickedGoogleSheet) {
  const metadata = await googleJson<SpreadsheetMetadata>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}?fields=sheets.properties.title`,
    sheet.accessToken,
  );
  if (metadata.sheets?.some(item => item.properties?.title === "Workout Log")) return;
  await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}:batchUpdate`,
    sheet.accessToken,
    { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: "Workout Log", gridProperties: { frozenRowCount: 1, hideGridlines: true } } } }] }) },
  );
  const headerRange = encodeURIComponent(sheetRange("Workout Log", "A1:I1"));
  await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}/values/${headerRange}?valueInputOption=USER_ENTERED`,
    sheet.accessToken,
    { method: "PUT", body: JSON.stringify({ values: [["Date", "Program", "Day", "Type", "Exercise", "Set", "Reps / Minutes", "Load (lb)", "Notes"]] }) },
  );
}

export async function writeImportedSet(args: {
  sheet: PickedGoogleSheet;
  workout: ImportedWorkout;
  exercise: ImportedExercise;
  setNumber: number;
  reps: number;
  load: number;
  existingRange?: string;
}) {
  const { sheet, workout, exercise, setNumber, reps, load, existingRange } = args;
  if (workout.writeMode === "cells") {
    const row = exercise.writeRows?.[setNumber - 1];
    if (!row) throw new Error("Forge could not locate this set in the selected sheet.");
    const range = encodeURIComponent(sheetRange(workout.sourceSheetName, `F${row}:G${row}`));
    await googleJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}/values/${range}?valueInputOption=USER_ENTERED`,
      sheet.accessToken,
      { method: "PUT", body: JSON.stringify({ values: [[reps, load]] }) },
    );
    return sheetRange(workout.sourceSheetName, `F${row}:G${row}`);
  }

  await ensureWorkoutLog(sheet);
  const values = [[new Date().toISOString().slice(0, 10), sheet.name, workout.dayName || `Day ${workout.day}`, workout.type, exercise.name, setNumber, reps, load, ""]];
  if (existingRange) {
    const range = encodeURIComponent(existingRange);
    await googleJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}/values/${range}?valueInputOption=USER_ENTERED`,
      sheet.accessToken,
      { method: "PUT", body: JSON.stringify({ values }) },
    );
    return existingRange;
  }
  const range = encodeURIComponent(sheetRange("Workout Log", "A:I"));
  const result = await googleJson<{ updates?: { updatedRange?: string } }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    sheet.accessToken,
    { method: "POST", body: JSON.stringify({ values }) },
  );
  return result.updates?.updatedRange;
}
