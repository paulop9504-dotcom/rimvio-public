import { NextResponse, type NextRequest } from "next/server";
import { resolveBeamSnapshot } from "@/lib/beam/resolve-beam";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const snapshot = await resolveBeamSnapshot(slug);

  if (!snapshot) {
    return NextResponse.json({ error: "Beam not found." }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
