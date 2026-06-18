import { encryptSecretPayload, decryptSecretPayload } from "@/lib/integrations/encrypt-secret";
import { maskSecret, pickPrimarySecret } from "@/lib/integrations/mask-secret";
import type {
  IntegrationAuthKind,
  IntegrationProviderId,
  IntegrationPublicRecord,
  IntegrationSecretPayload,
  IntegrationStatus,
} from "@/lib/integrations/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type DbRow = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  provider: string;
  auth_kind: IntegrationAuthKind;
  status: IntegrationStatus;
  label: string | null;
  masked_secret: string | null;
  secret_ciphertext: string;
  scopes: string[] | null;
  metadata: Record<string, unknown> | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToPublic(row: DbRow): IntegrationPublicRecord {
  return {
    provider: row.provider as IntegrationProviderId,
    authKind: row.auth_kind,
    status: row.status,
    label: row.label ?? row.provider,
    maskedSecret: row.masked_secret,
    scopes: row.scopes ?? [],
    connectedAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function listIntegrationsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<IntegrationPublicRecord[]> {
  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DbRow[]).map(rowToPublic);
}

export async function upsertIntegrationForUser(
  supabase: SupabaseClient,
  input: {
    userId: string;
    provider: IntegrationProviderId;
    authKind: IntegrationAuthKind;
    secret: IntegrationSecretPayload;
    label?: string;
    scopes?: string[];
    status?: IntegrationStatus;
    expiresAt?: string | null;
  },
): Promise<IntegrationPublicRecord> {
  const primary = pickPrimarySecret(input.secret as Record<string, string>);
  const ciphertext = encryptSecretPayload(input.secret);
  const now = new Date().toISOString();

  const row = {
    user_id: input.userId,
    session_id: null,
    provider: input.provider,
    auth_kind: input.authKind,
    status: input.status ?? "connected",
    label: input.label ?? input.provider,
    masked_secret: maskSecret(primary),
    secret_ciphertext: ciphertext,
    scopes: input.scopes ?? [],
    expires_at: input.expiresAt ?? null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("user_integrations")
    .upsert(row, { onConflict: "user_id,provider" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToPublic(data as DbRow);
}

export async function deleteIntegrationForUser(
  supabase: SupabaseClient,
  userId: string,
  provider: IntegrationProviderId,
): Promise<void> {
  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    throw new Error(error.message);
  }
}

export async function readIntegrationSecretForUser(
  supabase: SupabaseClient,
  userId: string,
  provider: IntegrationProviderId,
): Promise<IntegrationSecretPayload | null> {
  const { data, error } = await supabase
    .from("user_integrations")
    .select("secret_ciphertext")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error || !data?.secret_ciphertext) {
    return null;
  }

  return decryptSecretPayload(data.secret_ciphertext);
}

export async function isOAuthProviderConfiguredPublic(
  provider: IntegrationProviderId,
): Promise<boolean> {
  const { isOAuthProviderConfigured } = await import("@/lib/integrations/oauth-providers");
  return isOAuthProviderConfigured(provider);
}
