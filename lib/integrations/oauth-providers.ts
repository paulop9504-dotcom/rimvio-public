import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import type { IntegrationProviderId, IntegrationSecretPayload } from "@/lib/integrations/types";

export type OAuthProviderConfig = {
  provider: IntegrationProviderId;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  extraAuthorizeParams?: Record<string, string>;
};

export const OAUTH_PROVIDER_CONFIGS: Partial<
  Record<IntegrationProviderId, OAuthProviderConfig>
> = {
  slack: {
    provider: "slack",
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["channels:read", "chat:write", "users:read"],
    clientIdEnv: "SLACK_CLIENT_ID",
    clientSecretEnv: "SLACK_CLIENT_SECRET",
  },
  notion: {
    provider: "notion",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    clientIdEnv: "NOTION_CLIENT_ID",
    clientSecretEnv: "NOTION_CLIENT_SECRET",
    extraAuthorizeParams: {
      owner: "user",
    },
  },
  google_calendar: {
    provider: "google_calendar",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    extraAuthorizeParams: {
      access_type: "offline",
      prompt: "consent",
    },
  },
};

export function integrationOAuthCallbackUrl(origin?: string): string {
  const base = (origin ?? resolveAppOrigin()).replace(/\/$/, "");
  return `${base}/api/integrations/oauth/callback`;
}

export function readOAuthClientCredentials(provider: IntegrationProviderId): {
  clientId: string;
  clientSecret: string;
} | null {
  const config = OAUTH_PROVIDER_CONFIGS[provider];
  if (!config) {
    return null;
  }

  const clientId = process.env[config.clientIdEnv]?.trim();
  const clientSecret = process.env[config.clientSecretEnv]?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

export function isOAuthProviderConfigured(provider: IntegrationProviderId): boolean {
  return readOAuthClientCredentials(provider) !== null;
}

export function buildOAuthAuthorizeUrl(
  provider: IntegrationProviderId,
  state: string,
  origin?: string,
): string | null {
  const config = OAUTH_PROVIDER_CONFIGS[provider];
  const creds = readOAuthClientCredentials(provider);
  if (!config || !creds) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: integrationOAuthCallbackUrl(origin),
    response_type: "code",
    state,
  });

  if (config.scopes.length > 0) {
    params.set("scope", config.scopes.join(" "));
  }

  for (const [key, value] of Object.entries(config.extraAuthorizeParams ?? {})) {
    params.set(key, value);
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function exchangeOAuthCode(
  provider: IntegrationProviderId,
  code: string,
  origin?: string,
): Promise<IntegrationSecretPayload & { scopes?: string[] }> {
  const config = OAUTH_PROVIDER_CONFIGS[provider];
  const creds = readOAuthClientCredentials(provider);
  if (!config || !creds) {
    throw new Error(`OAuth not configured for ${provider}`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: integrationOAuthCallbackUrl(origin),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (provider === "notion") {
    const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
    body.set("grant_type", "authorization_code");
  } else {
    body.set("client_id", creds.clientId);
    body.set("client_secret", creds.clientSecret);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof json.error === "string"
        ? json.error
        : typeof json.error_description === "string"
          ? json.error_description
          : "OAuth token exchange failed";
    throw new Error(message);
  }

  if (provider === "slack") {
    if (!json.ok) {
      throw new Error(String(json.error ?? "Slack OAuth failed"));
    }
    const authed = json.authed_user as { access_token?: string } | undefined;
    const team = json.team as { id?: string; name?: string } | undefined;
    const bot = json.access_token as string | undefined;
    return {
      access_token: authed?.access_token ?? bot,
      workspace_id: team?.id,
      workspace_name: team?.name,
      bot_id: typeof json.bot_user_id === "string" ? json.bot_user_id : undefined,
      scopes: typeof json.scope === "string" ? json.scope.split(",") : config.scopes,
    };
  }

  if (provider === "notion") {
    const workspace = json.workspace_name as string | undefined;
    const workspaceId = json.workspace_id as string | undefined;
    return {
      access_token: String(json.access_token ?? ""),
      workspace_name: workspace,
      notion_workspace_id: workspaceId,
      notion_workspace_name: workspace,
      scopes: [],
    };
  }

  if (provider === "google_calendar") {
    return {
      access_token: String(json.access_token ?? ""),
      refresh_token:
        typeof json.refresh_token === "string" ? json.refresh_token : undefined,
      scopes:
        typeof json.scope === "string"
          ? json.scope.split(" ").filter(Boolean)
          : config.scopes,
    };
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}
