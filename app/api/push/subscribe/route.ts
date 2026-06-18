import { NextResponse, type NextRequest } from "next/server";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

type PushSubscribeBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

/** Accepts Web Push subscriptions — wire to DB/FCM when VAPID private key is ready. */
export async function POST(request: NextRequest) {
  const requestId = readRequestId(request);

  let body: PushSubscribeBody = {};
  try {
    body = (await request.json()) as PushSubscribeBody;
  } catch {
    body = {};
  }

  if (!body.endpoint?.trim()) {
    return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
  }

  logApi("info", "push_subscribe_ack", {
    route: "/api/push/subscribe",
    method: "POST",
    requestId,
    status: 200,
    detail: body.endpoint.slice(0, 48),
  });

  return NextResponse.json({
    ok: true,
    stored: false,
    message: "Subscription received — server push dispatch pending VAPID setup.",
  });
}
