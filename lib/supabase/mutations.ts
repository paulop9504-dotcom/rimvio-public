import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LinkRow } from "@/types/database";

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

export function buildOptimisticLink(input: {
  originalUrl: string;
  title: string;
  category?: string | null;
  thumbnailUrl?: string | null;
}): LinkRow {
  const now = new Date().toISOString();

  return {
    id: `optimistic-${crypto.randomUUID()}`,
    user_id: null,
    original_url: input.originalUrl,
    title: input.title,
    thumbnail_url: input.thumbnailUrl ?? null,
    domain: extractDomain(input.originalUrl),
    category: input.category ?? "Inbox",
    actions: [
      {
        id: crypto.randomUUID(),
        label: "Open link",
        kind: "open",
        href: input.originalUrl,
      },
    ],
    created_at: now,
    expires_at: null,
  };
}

import type { LinkActionItem } from "@/types/database";

function defaultActions(originalUrl: string): LinkActionItem[] {
  return [
    {
      id: crypto.randomUUID(),
      label: "원본 열기",
      kind: "open",
      href: originalUrl,
      payload: { icon: "external-link" },
    },
  ];
}

export async function insertLink(
  supabase: SupabaseClient<Database>,
  input: {
    originalUrl: string;
    title: string;
    category?: string | null;
    thumbnailUrl?: string | null;
    userId?: string | null;
    expiresAt?: string | null;
    actions?: LinkActionItem[];
  }
): Promise<LinkRow> {
  const domain = extractDomain(input.originalUrl);

  const { data, error } = await supabase
    .from("links")
    .insert({
      original_url: input.originalUrl,
      title: input.title,
      thumbnail_url: input.thumbnailUrl ?? null,
      domain,
      category: input.category ?? "Inbox",
      user_id: input.userId ?? null,
      expires_at: input.expiresAt ?? null,
      actions: input.actions?.length
        ? input.actions
        : defaultActions(input.originalUrl),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
