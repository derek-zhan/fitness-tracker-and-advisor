import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { googleConnections } from "../db/schema";
import { isAllowedGoogleEmail } from "./access-control";
import { randomOAuthValue } from "./google";

export const DEVICE_COOKIE = "forge_device";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const workerEnv = env as unknown as Record<string, string | undefined>;

export function isGoogleEmailAllowed(email: string) {
  return isAllowedGoogleEmail(email, workerEnv.ALLOWED_GOOGLE_EMAILS);
}

export function deviceIdFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === DEVICE_COOKIE) {
      try {
        const deviceId = decodeURIComponent(value.join("="));
        return /^[A-Za-z0-9_-]{43}$/.test(deviceId) ? deviceId : null;
      } catch { return null; }
    }
  }
  return null;
}

export async function hashDeviceId(deviceId: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(deviceId)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function deviceHashFromRequest(request: Request) {
  const deviceId = deviceIdFromRequest(request);
  return deviceId ? hashDeviceId(deviceId) : null;
}

export function newDeviceId() {
  return randomOAuthValue(32);
}

export function deviceCookie(deviceId: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${DEVICE_COOKIE}=${encodeURIComponent(deviceId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEVICE_COOKIE_MAX_AGE}${secure}`;
}

export function expiredDeviceCookie(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${DEVICE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function allowedConnectionForRequest(request: Request) {
  const deviceIdHash = await deviceHashFromRequest(request);
  if (!deviceIdHash) return { deviceIdHash: null, connection: null, status: "disconnected" as const };
  const db = getDb();
  const [connection] = await db.select().from(googleConnections).where(eq(googleConnections.deviceIdHash, deviceIdHash)).limit(1);
  if (!connection) return { deviceIdHash, connection: null, status: "disconnected" as const };
  if (!isGoogleEmailAllowed(connection.email)) return { deviceIdHash, connection: null, status: "unauthorized" as const };
  return { deviceIdHash, connection, status: "connected" as const };
}
