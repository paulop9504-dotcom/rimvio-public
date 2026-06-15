import { NextResponse, type NextRequest } from "next/server";
import { readCaptureCache } from "@/lib/server/capture-cache";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const payload = await readCaptureCache(token);

  if (!payload) {
    return NextResponse.json({ error: "capture_not_found" }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
