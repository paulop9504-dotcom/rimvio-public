import { NextResponse, type NextRequest } from "next/server";
import { handleShareReceiverPost } from "@/lib/share/share-receiver";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 60;
export const runtime = "nodejs";

/** PWA share target POST — reached via middleware rewrite from /share. */
export async function POST(request: NextRequest) {
  const requestId = readRequestId(request);
  return handleShareReceiverPost(request, requestId);
}
