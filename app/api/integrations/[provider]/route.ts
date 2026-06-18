import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { isIntegrationProviderId } from "@/lib/integrations/catalog";
import { deleteIntegrationForUser } from "@/lib/integrations/integrations-server-store";
import type { IntegrationProviderId } from "@/lib/integrations/types";
import { tryCreateClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { provider: raw } = await context.params;

  if (!isIntegrationProviderId(raw)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  const provider = raw as IntegrationProviderId;
  const userId = await getAuthUserId();
  const supabase = await tryCreateClient();

  if (!userId || !supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await deleteIntegrationForUser(supabase, userId, provider);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not disconnect.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
