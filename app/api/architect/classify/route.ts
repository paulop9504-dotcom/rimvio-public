import { NextResponse } from "next/server";
import { ingestData } from "@/lib/data-architect/ingest-data";
import { formatArchitectSummary } from "@/lib/data-architect/persist-architect-assignment";
import { listExistingContainers } from "@/lib/data-architect/list-existing-containers";

export async function GET() {
  return NextResponse.json({ containers: listExistingContainers() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { rawInput?: string; linkTitle?: string | null; linkUrl?: string | null };
  const rawInput = body.rawInput?.trim() ?? "";
  if (!rawInput) return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
  const wire = await ingestData({ rawInput, linkTitle: body.linkTitle, linkUrl: body.linkUrl });
  return NextResponse.json({ wire, summary: formatArchitectSummary(wire), containers: listExistingContainers() });
}
