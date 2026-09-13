export const WEIGHT_CHECK_IN_SPREADSHEET = "Workout Check-in";
export const WEIGHT_CHECK_IN_TAB = "Weight";

export type WeightCheckInFile = { id:string; name:string };

export class WeightCheckInSourceError extends Error {
  readonly code:"weight_spreadsheet_not_found"|"weight_spreadsheet_ambiguous";
  constructor(message:string,code:"weight_spreadsheet_not_found"|"weight_spreadsheet_ambiguous") {
    super(message);
    this.code=code;
    this.name="WeightCheckInSourceError";
  }
}

export function torontoDateKey(date=new Date()) {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const value=(type:Intl.DateTimeFormatPartTypes)=>parts.find(part=>part.type===type)?.value||"";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function sheetDateKey(value:unknown) {
  if (typeof value==="number"&&Number.isFinite(value)) return new Date(Date.UTC(1899,11,30)+value*86400000).toISOString().slice(0,10);
  const text=String(value??"").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed=Date.parse(text);
  return Number.isNaN(parsed)?text:new Date(parsed).toISOString().slice(0,10);
}

export function hasWeightRecordForDate(rows:unknown[][],date:string) {
  return rows.some(row=>sheetDateKey(row[0])===date);
}

export function selectWeightCheckInFile<T extends WeightCheckInFile>(files:T[]) {
  const matches=files.filter(file=>file.name.trim().toLowerCase()===WEIGHT_CHECK_IN_SPREADSHEET.toLowerCase());
  if (!matches.length) throw new WeightCheckInSourceError(`${WEIGHT_CHECK_IN_SPREADSHEET} spreadsheet was not found`,"weight_spreadsheet_not_found");
  if (matches.length>1) throw new WeightCheckInSourceError(`Multiple ${WEIGHT_CHECK_IN_SPREADSHEET} spreadsheets were found`,"weight_spreadsheet_ambiguous");
  return matches[0];
}

export function validateWeight(value:unknown) {
  if (typeof value!=="number"||!Number.isFinite(value)||value<=0) throw new Error("Enter a weight greater than zero");
  return value;
}
