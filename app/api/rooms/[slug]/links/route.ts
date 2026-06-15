import { NextResponse, type NextRequest } from "next/server";
import { upsertRoomLink } from "@/lib/rooms/server-room-store";
import type { LinkRow } from "@/types/database";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const body = (await request.json()) as {
      link?: LinkRow;
      roomName?: string;
    };

    if (!body.link?.id) {
      return NextResponse.json({ error: "Missing link." }, { status: 400 });
    }

    const state = upsertRoomLink(slug, body.link, body.roomName);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
