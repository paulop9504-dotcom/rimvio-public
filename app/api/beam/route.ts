import { NextResponse, type NextRequest } from "next/server";
import { persistBeamSnapshot } from "@/lib/beam/resolve-beam";
import type { BeamSnapshot } from "@/lib/beam/types";

export async function POST(request: NextRequest) {
  try {
    const snapshot = (await request.json()) as BeamSnapshot;

    if (!snapshot?.slug?.trim() || !snapshot.original_url?.trim()) {
      return NextResponse.json({ error: "Invalid beam payload." }, { status: 400 });
    }

    persistBeamSnapshot(snapshot);
    return NextResponse.json({ ok: true, slug: snapshot.slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save beam.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
