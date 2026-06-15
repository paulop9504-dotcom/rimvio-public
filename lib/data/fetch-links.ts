import { getAuthUserId } from "@/lib/auth/session";
import { isAuthRequired } from "@/lib/auth/policy";
import { filterActiveLinks } from "@/lib/utils/link-archive";
import { funFeedLinks } from "@/lib/demo/fun-feed-links";
import type { LinkRow } from "@/types/database";
import { tryCreateClient } from "@/lib/supabase/server";

export async function fetchLinks(): Promise<LinkRow[]> {
  const strictAuth = isAuthRequired();
  const userId = await getAuthUserId();

  if (strictAuth && !userId) {
    return [];
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return strictAuth || process.env.NODE_ENV !== "development" ? [] : funFeedLinks;
  }

  let query = supabase.from("links").select("*");

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (strictAuth) {
    return [];
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchLinks]", error.message);
    return strictAuth || process.env.NODE_ENV !== "development" ? [] : funFeedLinks;
  }

  if (!data?.length) {
    return strictAuth || process.env.NODE_ENV !== "development" ? [] : funFeedLinks;
  }

  return data;
}

export async function fetchActiveLinks(): Promise<LinkRow[]> {
  const links = await fetchLinks();
  return filterActiveLinks(links);
}
