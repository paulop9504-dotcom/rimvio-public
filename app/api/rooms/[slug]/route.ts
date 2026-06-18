import { NextResponse, type NextRequest } from "next/server";
import {
  getOrCreateRoomState,
  readRoomState,
} from "@/lib/rooms/server-room-store";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const state = readRoomState(slug) ?? getOrCreateRoomState(slug);
  return NextResponse.json(state);
}
