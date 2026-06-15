"use client";

import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  buildPersonalGlobePinRemoteRow,
  type PublishGlobePinRemoteInput,
} from "@/lib/globe/publish-globe-pin-remote";

export type PublishGlobePinRemoteResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
};

/** Upsert personal pin + visibility to server for P2 discovery. */
export async function tryPublishGlobePinVisibilityRemote(
  input: PublishGlobePinRemoteInput,
): Promise<PublishGlobePinRemoteResult> {
  if (typeof window === "undefined") {
    return { ok: false, skipped: true, reason: "server" };
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return { ok: false, skipped: true, reason: "signed-out" };
    }

    const row = buildPersonalGlobePinRemoteRow(input);
    const { error } = await supabase.from("personal_globe_pins").upsert(
      {
        user_id: userId,
        ...row,
      },
      { onConflict: "user_id,event_id" },
    );

    if (error) {
      return { ok: false, skipped: true, reason: error.message };
    }

    return { ok: true, skipped: false };
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : "publish-failed";
    return { ok: false, skipped: true, reason };
  }
}

/** Push all local pins with geo + visibility columns. */
export async function trySyncPersonalGlobePinVisibilityBatch(
  pins: readonly PersonalGlobePin[],
): Promise<number> {
  let pushed = 0;
  for (const pin of pins) {
    const result = await tryPublishGlobePinVisibilityRemote({
      pin,
      visibility: "private",
    });
    if (result.ok) {
      pushed += 1;
    }
  }
  return pushed;
}
