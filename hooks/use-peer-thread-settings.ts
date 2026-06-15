"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getOrCreatePeerThreadSettings,
  readPinnedRoster,
  setPeerThreadAiLens,
  setPeerThreadPinned,
  type SetPeerThreadPinnedResult,
} from "@/lib/context/peer-thread-settings-store";
import {
  peerStorageMode,
  shouldPersistPeerMessageLog,
  shouldRunAiLens,
  shouldRunEphemeralExtract,
  shouldShowContextRail,
} from "@/lib/context/peer-thread-policy";
import { countConnectedPeers } from "@/lib/context/pinned-peer-roster";
import type { PeerThreadSettings, PinnedPeerRoster } from "@/lib/context/peer-thread-types";

export type UsePeerThreadSettingsOptions = {
  peerThreadId: string;
  displayName: string;
};

export function usePeerThreadSettings(options: UsePeerThreadSettingsOptions) {
  const [settings, setSettings] = useState<PeerThreadSettings>(() =>
    getOrCreatePeerThreadSettings(options)
  );
  const [roster, setRoster] = useState<PinnedPeerRoster>(() => readPinnedRoster());
  const [pinError, setPinError] = useState<
    Extract<SetPeerThreadPinnedResult, { ok: false }>["reason"] | null
  >(null);

  const policy = useMemo(
    () => ({
      storageMode: peerStorageMode({ settings, roster }),
      runAiLens: shouldRunAiLens({ settings, roster }),
      showContextRail: shouldShowContextRail({ settings, roster }),
      persistFullLog: shouldPersistPeerMessageLog({ settings, roster }),
      ephemeralExtract: shouldRunEphemeralExtract({ settings, roster }),
    }),
    [settings, roster]
  );

  const setAiLens = useCallback(
    (enabled: boolean) => {
      const result = setPeerThreadAiLens({
        peerThreadId: options.peerThreadId,
        displayName: options.displayName,
        enabled,
      });
      setSettings(result.settings);
      setRoster(result.roster);
      setPinError(null);
    },
    [options.peerThreadId, options.displayName]
  );

  const setPinned = useCallback(
    (
      pinned: boolean,
      preferredSlotIndex?: import("@/lib/context/peer-thread-types").PinnedSlotIndex,
    ): SetPeerThreadPinnedResult => {
      const result = setPeerThreadPinned({
        peerThreadId: options.peerThreadId,
        displayName: options.displayName,
        pinned,
        preferredSlotIndex,
      });
      setSettings(result.settings);
      setRoster(result.roster);
      if (result.ok) {
        setPinError(null);
      } else {
        setPinError(result.reason);
      }
      return result;
    },
    [options.peerThreadId, options.displayName],
  );

  return {
    settings,
    roster,
    policy,
    pinError,
    pinnedCount: countConnectedPeers(roster),
    rosterFull: countConnectedPeers(roster) >= 5,
    setAiLens,
    setPinned,
  };
}
