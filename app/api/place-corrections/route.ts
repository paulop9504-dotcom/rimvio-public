import { NextResponse, type NextRequest } from "next/server";
import type { CorrectionLogEntry } from "@/lib/action-chat/confirmation-types";
import {
  listPlaceCorrections,
  upsertPlaceCorrections,
} from "@/lib/corrections/place-corrections-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type SyncBody = {
  sessionId?: string;
  entries?: CorrectionLogEntry[];
};

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "30", 10);

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId_required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ entries: [], persisted: false });
  }

  try {
    const entries = await listPlaceCorrections({
      sessionId,
      limit: Number.isFinite(limit) ? limit : 30,
    });
    return NextResponse.json({ entries, persisted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: SyncBody;

  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.sessionId || !body.entries?.length) {
    return NextResponse.json({ error: "sessionId_and_entries_required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, persisted: false, count: 0 });
  }

  try {
    const result = await upsertPlaceCorrections({
      sessionId: body.sessionId,
      entries: body.entries,
    });
    return NextResponse.json({ ok: true, persisted: true, count: result.persisted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
