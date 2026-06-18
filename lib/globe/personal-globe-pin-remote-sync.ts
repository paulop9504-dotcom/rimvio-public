import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  listPersonalGlobePins,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";

export type PersonalGlobePinSyncResult = {
  pulled: number;
  pushed: number;
  skipped: boolean;
  reason?: string;
};

/** Best-effort pull remote pins into local store — no-op when auth/server unavailable. */
export async function trySyncPersonalGlobePinsFromRemote(): Promise<PersonalGlobePinSyncResult> {
  if (typeof window === "undefined") {
    return { pulled: 0, pushed: 0, skipped: true, reason: "server" };
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return { pulled: 0, pushed: 0, skipped: true, reason: "signed-out" };
    }

    const { data, error } = await supabase
      .from("personal_globe_pins")
      .select("event_id,pin,updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      return { pulled: 0, pushed: 0, skipped: true, reason: error.message };
    }

    let pulled = 0;
    for (const row of data ?? []) {
      const pin = row.pin as PersonalGlobePin | null;
      if (!pin?.eventId?.trim()) {
        continue;
      }
      upsertPersonalGlobePin(pin);
      pulled += 1;
    }

    const local = listPersonalGlobePins();
    let pushed = 0;
    for (const pin of local) {
      const { error: upsertError } = await supabase.from("personal_globe_pins").upsert(
        {
          user_id: userId,
          event_id: pin.eventId,
          pin,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,event_id" },
      );
      if (!upsertError) {
        pushed += 1;
      }
    }

    return { pulled, pushed, skipped: false };
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : "sync-failed";
    return { pulled: 0, pushed: 0, skipped: true, reason };
  }
}
