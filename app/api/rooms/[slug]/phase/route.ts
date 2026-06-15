import { NextResponse, type NextRequest } from "next/server";
import { recordRoomPhaseAction } from "@/lib/rooms/server-room-store";
import type { LinkActionItem } from "@/types/database";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const body = (await request.json()) as { action?: LinkActionItem };

    if (!body.action?.label) {
      return NextResponse.json({ error: "Missing action." }, { status: 400 });
    }

    const phase = recordRoomPhaseAction(slug, body.action);
    return NextResponse.json({ phase });
  } catch {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
}
