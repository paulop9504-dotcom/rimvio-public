import { toBeamSnapshot } from "@/lib/share/beam-url";
import type { LinkRow } from "@/types/database";

export async function registerBeamSnapshot(link: LinkRow) {
  if (!link.share_slug) {
    return;
  }

  try {
    await fetch("/api/beam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBeamSnapshot(link)),
    });
  } catch {
    // Local dev can still read from Supabase when configured.
  }
}
