import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { googleConnections } from "../db/schema";

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

export async function accessTokenForUser(userId: string) {
  const db = getDb();
  const [connection] = await db.select().from(googleConnections).where(eq(googleConnections.userId, userId)).limit(1);
  if (!connection) return null;
  const refreshToken = await decryptToken(connection.encryptedRefreshToken);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: googleClientId(), client_secret: googleClientSecret(), refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "Google authorization expired");
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

function sheetApi(spreadsheetId: string, suffix = "") {
  return `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}${suffix}`;
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
  return title;
}

export async function writeWorkoutSet(accessToken: string, spreadsheetId: string, sheetTab: string, exerciseIndex: number, setNumber: number, reps: number, load: number) {
  const row = 5 + exerciseIndex * 6 + setNumber - 1;
  const quoted = `'${sheetTab.replace(/'/g, "''")}'`;
  await googleJson(`${sheetApi(spreadsheetId, "/values:batchUpdate")}`, accessToken, { method: "POST", body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: [
    { range: `${quoted}!F${row}:G${row}`, values: [[reps, load]] },
  ] }) });
}
