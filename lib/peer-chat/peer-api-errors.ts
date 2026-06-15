import { NextResponse } from "next/server";
import { extractErrorMessage } from "@/lib/peer-chat/extract-error-message";

export function peerApiErrorResponse(error: unknown, fallback: string) {
  const message = extractErrorMessage(error, fallback);
  if (message.includes("not_registered")) {
    const text = message.split(":").slice(1).join(":").trim() || fallback;
    return NextResponse.json(
      { error: "not_registered", message: text },
      { status: 404 },
    );
  }
  return NextResponse.json({ error: message, message }, { status: 500 });
}
