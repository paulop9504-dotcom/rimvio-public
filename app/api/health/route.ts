import { NextResponse } from "next/server";
import { collectHealthReport } from "@/lib/server/health-check";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const report = await collectHealthReport();

  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
