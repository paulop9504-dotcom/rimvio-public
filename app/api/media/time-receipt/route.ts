import { NextResponse, type NextRequest } from "next/server";
import { shouldShowTimeReceipt } from "@/lib/media/article-url";
import { buildTimeReceiptSnapshot, unavailableReceipt } from "@/lib/media/time-receipt";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";
import { assertSafeOutboundUrl } from "@/lib/server/ssrf-guard";

export const maxDuration = 20;
export const runtime = "nodejs";

type TimeReceiptRequest = {
  url?: string;
  title?: string;
  domain?: string;
  source_type?: string | null;
  category?: string | null;
};

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = readRequestId(request);

  let body: TimeReceiptRequest = {};
  try {
    body = (await request.json()) as TimeReceiptRequest;
  } catch {
    body = {};
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  const linkLike = {
    original_url: url,
    domain: body.domain ?? "",
    source_type: body.source_type ?? null,
    category: body.category ?? null,
  };

  if (!shouldShowTimeReceipt(linkLike)) {
    return NextResponse.json(
      unavailableReceipt(
        body.title?.trim() || url,
        "YouTube·기사·블로그 링크에서 표시됩니다."
      )
    );
  }

  try {
    const safeUrl = assertSafeOutboundUrl(url);
    const snapshot = await buildTimeReceiptSnapshot({
      url: safeUrl,
      title: body.title,
      domain: body.domain,
      source_type: body.source_type,
      category: body.category,
    });

    logApi("info", "time_receipt_ok", {
      route: "/api/media/time-receipt",
      method: "POST",
      requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
      detail: snapshot.available ? snapshot.kind ?? "ready" : "partial",
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time receipt failed.";

    logApi("warn", "time_receipt_failed", {
      route: "/api/media/time-receipt",
      method: "POST",
      requestId,
      status: 500,
      durationMs: Date.now() - startedAt,
      detail: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
