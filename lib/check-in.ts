export const CHECK_IN_TAB = "Check-in";

export type CheckInQuestion = {
  column: number;
  label: string;
};

export type CheckInAnswer = CheckInQuestion & {
  value: string;
};

export type WeightPoint = {
  date: string;
  weight: number;
};

export type WeightProgress = {
  fromDate: string | null;
  toDate: string;
  points: WeightPoint[];
  startWeight: number | null;
  endWeight: number | null;
  change: number | null;
};

export type CheckInExperience = {
  date: string;
  previousDate: string | null;
  weekNumber: number;
  completed: boolean;
  questions: CheckInQuestion[];
  answers: CheckInAnswer[];
  weightProgress: WeightProgress;
  sheetUrl: string;
};

export class CheckInSourceError extends Error {
  readonly code: "check_in_tab_not_found" | "check_in_headers_invalid" | "check_in_questions_changed";

  constructor(message: string, code: CheckInSourceError["code"]) {
    super(message);
    this.code = code;
    this.name = "CheckInSourceError";
  }
}

export class CheckInAlreadyCompletedError extends Error {}
export class InvalidCheckInAnswersError extends Error {}

function checkInDateKey(value:unknown) {
  if (typeof value==="number"&&Number.isFinite(value)) return new Date(Date.UTC(1899,11,30)+value*86400000).toISOString().slice(0,10);
  const text=String(value??"").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed=Date.parse(text);
  return Number.isNaN(parsed)?text:new Date(parsed).toISOString().slice(0,10);
}

export function isUploadQuestion(value: unknown) {
  return /(?:\bupload\b|progress\s*photo|photo\s*upload)/i.test(String(value ?? ""));
}

export function checkInQuestions(headers: unknown[]): CheckInQuestion[] {
  const dateHeader = String(headers[0] ?? "").trim().toLowerCase();
  const weekHeader = String(headers[1] ?? "").trim().toLowerCase();
  if (dateHeader !== "date" || weekHeader !== "week") {
    throw new CheckInSourceError("Check-in must start with Date and Week columns", "check_in_headers_invalid");
  }

  return headers.flatMap((header, column) => {
    const label = String(header ?? "").trim();
    if (column < 2 || !label || isUploadQuestion(label)) return [];
    return [{ column, label }];
  });
}

export function weekNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  const match = /^(?:week\s*)?(\d+)$/i.exec(String(value ?? "").trim());
  const parsed = match ? Number(match[1]) : 0;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function nextCheckInWeek(rows: unknown[][]) {
  return rows.reduce((highest, row) => /^\d{4}-\d{2}-\d{2}$/.test(checkInDateKey(row[0])) ? Math.max(highest, weekNumber(row[1]) ?? 0) : highest, 0) + 1;
}

export function checkInRowForDate(rows: unknown[][], date: string) {
  return rows.find((row) => checkInDateKey(row[0]) === date);
}

export function previousCheckInDate(rows: unknown[][], date: string) {
  const dates = rows
    .map((row) => checkInDateKey(row[0]))
    .filter((candidate) => /^\d{4}-\d{2}-\d{2}$/.test(candidate) && candidate < date)
    .sort();
  return dates.at(-1) ?? null;
}

export function answersForRow(questions: CheckInQuestion[], row?: unknown[]): CheckInAnswer[] {
  return questions.map((question) => ({ ...question, value: String(row?.[question.column] ?? "") }));
}

export function weightProgress(rows: unknown[][], previousDate: string | null, date: string): WeightProgress {
  const points = rows.flatMap((row): WeightPoint[] => {
    const pointDate = checkInDateKey(row[0]);
    const weight = Number(row[1]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pointDate) || pointDate > date || (previousDate && pointDate < previousDate) || !Number.isFinite(weight) || weight <= 0) return [];
    return [{ date: pointDate, weight }];
  }).sort((a, b) => a.date.localeCompare(b.date));
  const startWeight = points[0]?.weight ?? null;
  const endWeight = points.at(-1)?.weight ?? null;
  return {
    fromDate: previousDate,
    toDate: date,
    points,
    startWeight,
    endWeight,
    change: points.length >= 2 && startWeight !== null && endWeight !== null ? Number((endWeight - startWeight).toFixed(1)) : null,
  };
}

export function validateCheckInAnswers(questions: CheckInQuestion[], answers: CheckInAnswer[]) {
  if (answers.length !== questions.length) {
    throw new CheckInSourceError("The Check-in questions changed. Reload and try again.", "check_in_questions_changed");
  }
  return questions.map((question, index) => {
    const answer = answers[index];
    if (!answer || answer.column !== question.column || answer.label !== question.label) {
      throw new CheckInSourceError("The Check-in questions changed. Reload and try again.", "check_in_questions_changed");
    }
    const value = String(answer.value ?? "").trim();
    if (!value) throw new InvalidCheckInAnswersError("Answer every question before finishing your check-in");
    return { ...question, value };
  });
}

export function buildCheckInRow(headers: unknown[], date: string, week: number, answers: CheckInAnswer[]) {
  const row = Array.from({ length: headers.length }, () => "" as string | number);
  row[0] = date;
  row[1] = week;
  for (const answer of answers) row[answer.column] = answer.value;
  return row;
}
