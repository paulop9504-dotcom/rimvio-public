import { listRoomPresence, touchRoomPresence } from "@/lib/rooms/server-presence";
import { readRoomRevision } from "@/lib/rooms/server-room-store";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  let lastRevision = readRoomRevision(slug);
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const push = (payload: unknown) => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const tick = () => {
        if (closed) {
          return;
        }

        const revision = readRoomRevision(slug);
        const peers = listRoomPresence(slug);

        if (revision !== lastRevision) {
          lastRevision = revision;
          push({ type: "sync", revision, peers });
          return;
        }

        push({ type: "pulse", revision, peers });
      };

      push({ type: "hello", revision: lastRevision, peers: listRoomPresence(slug) });
      tick();

      const interval = setInterval(tick, 1200);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const body = (await request.json()) as {
      id?: string;
      label?: string;
      color?: string;
    };

    if (!body.id || !body.label || !body.color) {
      return Response.json({ error: "Missing presence." }, { status: 400 });
    }

    const peers = touchRoomPresence(slug, {
      id: body.id,
      label: body.label,
      color: body.color,
    });

    return Response.json({ peers, revision: readRoomRevision(slug) });
  } catch {
    return Response.json({ error: "Invalid presence." }, { status: 400 });
  }
}
