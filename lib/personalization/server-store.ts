import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  LinkLifecycleRecord,
  RecentActionProfile,
} from "@/lib/personalization/types";

type ProfileRow = {
  recent_clicks: unknown;
  family_counts: unknown;
  domain_affinity: unknown;
  click_total: number;
  updated_at: string;
};

type LinkStateRow = {
  link_id: string;
  domain_family: string;
  link_category: string | null;
  lifecycle_state: string;
  first_saved_at: string;
  last_opened_at: string | null;
  last_action_family: string | null;
  last_action_at: string | null;
  reopen_count: number;
};

function parseProfile(row: ProfileRow | null): RecentActionProfile | null {
  if (!row) {
    return null;
  }

  return {
    recent_clicks: Array.isArray(row.recent_clicks)
      ? (row.recent_clicks as RecentActionProfile["recent_clicks"])
      : [],
    family_counts: (row.family_counts as RecentActionProfile["family_counts"]) ?? {},
    domain_affinity:
      (row.domain_affinity as RecentActionProfile["domain_affinity"]) ?? {},
    click_total: row.click_total ?? 0,
    updated_at: row.updated_at,
  };
}

function parseLinkState(row: LinkStateRow): LinkLifecycleRecord {
  return {
    link_id: row.link_id,
    domain_family: row.domain_family as LinkLifecycleRecord["domain_family"],
    link_category: row.link_category,
    lifecycle_state: row.lifecycle_state as LinkLifecycleRecord["lifecycle_state"],
    first_saved_at: row.first_saved_at,
    last_opened_at: row.last_opened_at,
    last_action_family: row.last_action_family as LinkLifecycleRecord["last_action_family"],
    last_action_at: row.last_action_at,
    reopen_count: row.reopen_count,
  };
}

export async function fetchRecentProfile(
  supabase: SupabaseClient<Database>,
  input: { userId?: string | null; sessionId: string }
): Promise<RecentActionProfile | null> {
  if (input.userId) {
    const { data } = await supabase
      .from("user_recent_action_profile")
      .select("recent_clicks, family_counts, domain_affinity, click_total, updated_at")
      .eq("user_id", input.userId)
      .maybeSingle();

    return parseProfile(data as ProfileRow | null);
  }

  const { data } = await supabase
    .from("user_recent_action_profile")
    .select("recent_clicks, family_counts, domain_affinity, click_total, updated_at")
    .is("user_id", null)
    .eq("session_id", input.sessionId)
    .maybeSingle();

  return parseProfile(data as ProfileRow | null);
}

export async function fetchLinkLifecycleState(
  supabase: SupabaseClient<Database>,
  input: { userId?: string | null; sessionId: string; linkId: string }
): Promise<LinkLifecycleRecord | null> {
  let query = supabase
    .from("user_link_states")
    .select(
      "link_id, domain_family, link_category, lifecycle_state, first_saved_at, last_opened_at, last_action_family, last_action_at, reopen_count"
    )
    .eq("link_id", input.linkId);

  if (input.userId) {
    query = query.eq("user_id", input.userId);
  } else {
    query = query.is("user_id", null).eq("session_id", input.sessionId);
  }

  const { data } = await query.maybeSingle();
  return data ? parseLinkState(data as LinkStateRow) : null;
}

export async function recordPersonalizationClickRpc(
  supabase: SupabaseClient<Database>,
  input: {
    sessionId: string;
    userId?: string | null;
    linkId?: string | null;
    contextBin: string;
    actionKey: string;
    actionFamily: string;
    domain?: string | null;
    domainFamily: string;
    linkCategory?: string | null;
    routeMode?: string | null;
    metadata?: import("@/types/database").Json;
  }
) {
  const { data, error } = await supabase.rpc("record_personalization_click", {
    p_session_id: input.sessionId,
    p_user_id: input.userId ?? undefined,
    p_link_id: input.linkId ?? undefined,
    p_context_bin: input.contextBin,
    p_action_key: input.actionKey,
    p_action_family: input.actionFamily,
    p_domain: input.domain ?? undefined,
    p_domain_family: input.domainFamily,
    p_link_category: input.linkCategory ?? undefined,
    p_route_mode: input.routeMode ?? undefined,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function recordUserActionEventRpc(
  supabase: SupabaseClient<Database>,
  input: {
    sessionId: string;
    userId?: string | null;
    linkId?: string | null;
    contextBin: string;
    actionKey: string;
    actionFamily: string;
    domain?: string | null;
    domainFamily: string;
    linkCategory?: string | null;
    routeMode?: string | null;
    event: string;
    metadata?: import("@/types/database").Json;
  }
) {
  const { data, error } = await supabase.rpc("record_user_action_event", {
    p_session_id: input.sessionId,
    p_user_id: input.userId ?? undefined,
    p_link_id: input.linkId ?? undefined,
    p_context_bin: input.contextBin,
    p_action_key: input.actionKey,
    p_action_family: input.actionFamily,
    p_domain: input.domain ?? undefined,
    p_domain_family: input.domainFamily,
    p_link_category: input.linkCategory ?? undefined,
    p_route_mode: input.routeMode ?? undefined,
    p_event: input.event,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function recordLinkReopenRpc(
  supabase: SupabaseClient<Database>,
  input: {
    sessionId: string;
    linkId: string;
    userId?: string | null;
    domainFamily: string;
    linkCategory?: string | null;
  }
) {
  const { data, error } = await supabase.rpc("record_link_reopen", {
    p_session_id: input.sessionId,
    p_link_id: input.linkId,
    p_user_id: input.userId ?? undefined,
    p_domain_family: input.domainFamily,
    p_link_category: input.linkCategory ?? undefined,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function mergeGuestPersonalizationRpc(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  userId: string
) {
  const { data, error } = await supabase.rpc("merge_guest_personalization", {
    p_session_id: sessionId,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return data;
}
