import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { googleConnections } from "../../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ connected: false }, { status: 401 });
  const [connection] = await getDb().select({ email: googleConnections.email }).from(googleConnections).where(eq(googleConnections.userId, user.userId)).limit(1);
  return Response.json({ connected: Boolean(connection), email: connection?.email || null });
}
