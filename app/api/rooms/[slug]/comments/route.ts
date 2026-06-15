import { NextResponse, type NextRequest } from "next/server";
import { addRoomComment, readRoomState } from "@/lib/rooms/server-room-store";
import type { LinkCommentRow } from "@/types/database";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const body = (await request.json()) as { comment?: LinkCommentRow };

    if (!body.comment?.link_id || !body.comment.message) {
      return NextResponse.json({ error: "Missing comment." }, { status: 400 });
    }

    addRoomComment(slug, body.comment);
    return NextResponse.json(readRoomState(slug));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add comment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
