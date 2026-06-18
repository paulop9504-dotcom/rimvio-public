import { NextResponse, type NextRequest } from "next/server";
import {
  generateSecondaryActions,
  toSecondaryActionPublicJson,
} from "@/lib/secondary-action-generator/generate-secondary-actions";
import type { SecondaryActionGeneratorInput } from "@/lib/secondary-action-generator/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: SecondaryActionGeneratorInput;

  try {
    body = (await request.json()) as SecondaryActionGeneratorInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.main_action?.label || !body.event?.title) {
    return NextResponse.json(
      { error: "Missing main_action.label or event.title." },
      { status: 400 },
    );
  }

  const actions = generateSecondaryActions(body);
  return NextResponse.json(toSecondaryActionPublicJson(actions));
}
