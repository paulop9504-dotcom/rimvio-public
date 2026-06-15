import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { catalogEntryFor, isIntegrationProviderId } from "@/lib/integrations/catalog";
import {
  listIntegrationsForUser,
  upsertIntegrationForUser,
} from "@/lib/integrations/integrations-server-store";
import {
  readLocalIntegrations,
  upsertLocalIntegration,
} from "@/lib/integrations/integrations-client-store";
import type {
  IntegrationAuthKind,
  IntegrationProviderId,
  IntegrationSecretPayload,
} from "@/lib/integrations/types";
import { isOAuthProviderConfigured } from "@/lib/integrations/oauth-providers";
import { tryCreateClient } from "@/lib/supabase/server";

type UpsertBody = {
  provider?: string;
  authKind?: IntegrationAuthKind;
  secret?: IntegrationSecretPayload;
  label?: string;
  /** Convenience — single API key field */
  apiKey?: string;
};

function normalizeSecret(
  provider: IntegrationProviderId,
  body: UpsertBody,
): IntegrationSecretPayload {
  if (body.secret && Object.keys(body.secret).length > 0) {
    return body.secret;
  }

  const entry = catalogEntryFor(provider);
  if (body.apiKey?.trim()) {
    return { api_key: body.apiKey.trim() };
  }

  if (entry?.apiKeyFields?.length) {
    throw new Error("Missing required API key fields.");
  }

  throw new Error("Missing secret or apiKey.");
}

export async function GET() {
  const userId = await getAuthUserId();
  const supabase = await tryCreateClient();

  const oauthConfigured = {
    slack: isOAuthProviderConfigured("slack"),
    notion: isOAuthProviderConfigured("notion"),
    google_calendar: isOAuthProviderConfigured("google_calendar"),
  };

  if (!userId || !supabase) {
    return NextResponse.json({
      persisted: false,
      integrations: [],
      oauthConfigured,
      hint: "guest_mode",
    });
  }

  try {
    const integrations = await listIntegrationsForUser(supabase, userId);
    return NextResponse.json({
      persisted: true,
      integrations,
      oauthConfigured,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list integrations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: UpsertBody;

  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.provider || !isIntegrationProviderId(body.provider)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  const provider = body.provider;
  const authKind = body.authKind ?? "api_key";
  const entry = catalogEntryFor(provider);

  if (!entry?.authKinds.includes(authKind)) {
    return NextResponse.json({ error: "Auth kind not supported for provider." }, { status: 400 });
  }

  let secret: IntegrationSecretPayload;
  try {
    secret = normalizeSecret(provider, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid secret payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const primary =
    secret.access_token?.trim() ??
    secret.api_key?.trim() ??
    secret.client_id?.trim() ??
    "";

  if (!primary) {
    return NextResponse.json({ error: "Empty secret." }, { status: 400 });
  }

  const userId = await getAuthUserId();
  const supabase = await tryCreateClient();

  if (!userId || !supabase) {
    return NextResponse.json(
      {
        error: "Login required to save integrations securely.",
        code: "auth_required",
      },
      { status: 401 },
    );
  }

  try {
    const record = await upsertIntegrationForUser(supabase, {
      userId,
      provider,
      authKind,
      secret,
      label: body.label,
      scopes: entry.oauthScopes,
    });

    return NextResponse.json({ ok: true, integration: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save integration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
