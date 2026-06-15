"use client";

import { useEffect, useRef } from "react";
import { trySyncPersonalGlobePinsFromRemote } from "@/lib/globe/personal-globe-pin-remote-sync";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";

/** Pull/push personal globe pins when signed in. */
export function usePersonalGlobePinSync(enabled = true) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled || ranRef.current) {
      return;
    }
    ranRef.current = true;

    void trySyncPersonalGlobePinsFromRemote().then((result) => {
      if (!result.skipped && (result.pulled > 0 || result.pushed > 0)) {
        window.dispatchEvent(new CustomEvent(PERSONAL_GLOBE_PINS_UPDATED));
      }
    });
  }, [enabled]);
}
