import { NextResponse } from "next/server";
import { ingestPlaceText } from "@/lib/data-ingestion/ingest-place-text";
import { buildActionsForIngestion } from "@/lib/data-ingestion/ingest-place-text";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "text_required" }, { status: 400 });
    }

    const result = await ingestPlaceText(text);
    if (!result) {
      return NextResponse.json({ error: "parse_failed" }, { status: 422 });
    }

    return NextResponse.json({
      schema: result.schema,
      container: result.container,
      actions: buildActionsForIngestion(result),
    });
  } catch {
    return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
  }
}
