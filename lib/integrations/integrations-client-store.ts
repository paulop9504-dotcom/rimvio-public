"use client";

import { catalogEntryFor } from "@/lib/integrations/catalog";
import { maskSecret, pickPrimarySecret } from "@/lib/integrations/mask-secret";
import type {
  IntegrationAuthKind,
  IntegrationProviderId,
  IntegrationPublicRecord,
  IntegrationSecretPayload,
  IntegrationStatus,
} from "@/lib/integrations/types";

export const INTEGRATIONS_STORAGE_KEY = "rimvio.integrations.v1";
export const INTEGRATIONS_UPDATED = "rimvio-integrations-updated";

type StoredIntegration = {
  provider: IntegrationProviderId;
  authKind: IntegrationAuthKind;
  status: IntegrationStatus;
  label: string;
  secret: IntegrationSecretPayload;
  scopes: string[];
  connectedAt: string;
  expiresAt: string | null;
};

const STORAGE_KEY = INTEGRATIONS_STORAGE_KEY;

let memoryStore: StoredIntegration[] = [];

function readAll(): StoredIntegration[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredIntegration[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: StoredIntegration[]) {
  if (typeof window === "undefined") {
    memoryStore = items;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
  window.dispatchEvent(new CustomEvent(INTEGRATIONS_UPDATED));
}

function toPublic(record: StoredIntegration): IntegrationPublicRecord {
  return {
    provider: record.provider,
    authKind: record.authKind,
    status: record.status,
    label: record.label,
    maskedSecret: maskSecret(pickPrimarySecret(record.secret as Record<string, string>)),
    scopes: record.scopes,
    connectedAt: record.connectedAt,
    expiresAt: record.expiresAt,
  };
}

export function readLocalIntegrations(): IntegrationPublicRecord[] {
  return readAll().map(toPublic);
}

export function upsertLocalIntegration(input: {
  provider: IntegrationProviderId;
  authKind: IntegrationAuthKind;
  secret: IntegrationSecretPayload;
  label?: string;
  scopes?: string[];
}): IntegrationPublicRecord {
  const now = new Date().toISOString();
  const entry = catalogEntryFor(input.provider);
  const record: StoredIntegration = {
    provider: input.provider,
    authKind: input.authKind,
    status: "connected",
    label:
      input.label ??
      input.secret.workspace_name ??
      input.secret.notion_workspace_name ??
      entry?.label ??
      input.provider,
    secret: input.secret,
    scopes: input.scopes ?? entry?.oauthScopes ?? [],
    connectedAt: now,
    expiresAt: null,
  };

  const next = [record, ...readAll().filter((item) => item.provider !== input.provider)];
  writeAll(next);
  return toPublic(record);
}

export function removeLocalIntegration(provider: IntegrationProviderId) {
  writeAll(readAll().filter((item) => item.provider !== provider));
}

export function readLocalIntegrationSecret(
  provider: IntegrationProviderId,
): IntegrationSecretPayload | null {
  const hit = readAll().find((item) => item.provider === provider);
  return hit?.secret ?? null;
}

export function exportLocalIntegrationsForMerge(): StoredIntegration[] {
  return readAll();
}

export function importMergedIntegrations(records: IntegrationPublicRecord[]) {
  if (!records.length) {
    return;
  }
  const existing = readAll();
  const merged = [...existing];
  for (const pub of records) {
    if (merged.some((item) => item.provider === pub.provider)) {
      continue;
    }
    merged.push({
      provider: pub.provider,
      authKind: pub.authKind,
      status: pub.status,
      label: pub.label,
      secret: {},
      scopes: pub.scopes,
      connectedAt: pub.connectedAt,
      expiresAt: pub.expiresAt,
    });
  }
  writeAll(merged);
}
