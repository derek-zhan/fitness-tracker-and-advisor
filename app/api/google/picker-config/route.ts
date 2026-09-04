import { googlePickerConfig } from "../../../../lib/google";

export async function GET() {
  try {
    return Response.json(googlePickerConfig(), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Google Picker is not configured" }, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
}
