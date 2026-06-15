/** User-connected services — OAuth or API key. */

export type IntegrationAuthKind = "oauth" | "api_key";

export type IntegrationProviderId =
  | "slack"
  | "notion"
  | "google_calendar"
  | "naver_search"
  | "openweather"
  | "openai";

export type IntegrationStatus = "connected" | "error" | "revoked";

/** Stored secret payload (encrypted server-side). */
export type IntegrationSecretPayload = {
  access_token?: string;
  refresh_token?: string;
  api_key?: string;
  client_id?: string;
  client_secret?: string;
  webhook_url?: string;
  workspace_name?: string;
  workspace_id?: string;
  bot_id?: string;
  notion_workspace_id?: string;
  notion_workspace_name?: string;
};

/** Public view — never includes raw secrets. */
export type IntegrationPublicRecord = {
  provider: IntegrationProviderId;
  authKind: IntegrationAuthKind;
  status: IntegrationStatus;
  label: string;
  maskedSecret: string | null;
  scopes: string[];
  connectedAt: string;
  expiresAt: string | null;
};

export type IntegrationCatalogEntry = {
  id: IntegrationProviderId;
  label: string;
  emoji: string;
  hint: string;
  authKinds: IntegrationAuthKind[];
  oauthScopes?: string[];
  apiKeyPlaceholder?: string;
  apiKeyFields?: Array<{
    key: keyof IntegrationSecretPayload;
    label: string;
    placeholder: string;
    secret?: boolean;
  }>;
};
