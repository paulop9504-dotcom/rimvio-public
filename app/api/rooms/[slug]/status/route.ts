import { NextResponse, type NextRequest } from "next/server";
import {
  addRoomComment,
  readRoomState,
  updateRoomLinkStatus,
} from "@/lib/rooms/server-room-store";
import type { LinkCommentRow } from "@/types/database";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const body = (await request.json()) as {
      linkId?: string;
      status?: "open" | "done";
      comment?: LinkCommentRow;
    };

    if (!body.linkId || !body.status) {
      return NextResponse.json({ error: "Missing status payload." }, { status: 400 });
    }

    updateRoomLinkStatus(slug, body.linkId, body.status);

    if (body.comment) {
      addRoomComment(slug, body.comment);
    }

    return NextResponse.json(readRoomState(slug));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
