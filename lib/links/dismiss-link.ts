import {
  addDismissedLinkId,
  addLocalLink,
  removeDismissedLinkId,
  removeLocalLink,
} from "@/lib/local-links/store";
import { toContextBin } from "@/lib/intent/context-bin";
import { normalizeEnricherContext } from "@/lib/enrichers/context";
import { toDomainFamily } from "@/lib/personalization/action-family";
import { markLocalLinkUndoneIfRecent } from "@/lib/personalization/client-store";
import { trackUserAction } from "@/lib/personalization/track-user-action";
import { tryCreateClient } from "@/lib/supabase/client";
import type { LinkRow } from "@/types/database";

function isLocalLinkId(id: string) {
  return id.startsWith("local-") || id.startsWith("optimistic-");
}

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

/** Commit dismiss after undo window closes. */
export async function persistDismissedLink(link: LinkRow) {
  const undo = markLocalLinkUndoneIfRecent(link.id);
  if (undo) {
    const contextBin = toContextBin(
      normalizeEnricherContext({ hour: new Date().getHours() })
    );
    trackUserAction({
      event: "skip",
      link,
      actionKey: "link:undone",
      actionFamily: "done_close",
      domainFamily: toDomainFamily(link.domain, link.category),
      contextBin,
      updateProfile: false,
      metadata: {
        is_undone: true,
        undone_within_ms: undo.undone_within_ms,
      },
    });
  }

  addDismissedLinkId(link.id);

  if (isLocalLinkId(link.id)) {
    removeLocalLink(link.id);
    return;
  }

  removeLocalLink(link.id);

  if (!isUuid(link.id)) {
    return;
  }

  const supabase = tryCreateClient();
  if (!supabase) {
    return;
  }

  const expiresAt = new Date().toISOString();

  await supabase.from("links").update({ expires_at: expiresAt }).eq("id", link.id);
}

/** Undo swipe dismiss — restore Feed visibility. */
export async function restoreDismissedLink(link: LinkRow) {
  removeDismissedLinkId(link.id);

  if (isLocalLinkId(link.id)) {
    addLocalLink(link);
    return;
  }

  if (!isUuid(link.id)) {
    return;
  }

  const supabase = tryCreateClient();
  if (!supabase) {
    return;
  }

  await supabase.from("links").update({ expires_at: link.expires_at }).eq("id", link.id);
}
