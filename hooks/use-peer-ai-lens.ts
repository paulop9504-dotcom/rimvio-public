"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { analyzePeerThreadForLens } from "@/lib/peer-chat/ai-lens/rank-lens-bubbles";
import { recordLensBubbleShown } from "@/lib/peer-chat/ai-lens/lens-user-history";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import type { PeerMessage } from "@/lib/context/peer-message-types";

const LENS_DEBOUNCE_MS = 400;

export function usePeerAiLens(input: {
  messages: readonly PeerMessage[];
  enabled: boolean;
}) {
  const [candidates, setCandidates] = useState<DeepLinkBubbleCandidate[]>([]);
  const [candidatesByMessageId, setCandidatesByMessageId] = useState<
    Readonly<Record<string, DeepLinkBubbleCandidate[]>>
  >({});
  const [anchorMessageId, setAnchorMessageId] = useState<string | null>(null);
  const lastShownKey = useRef<string>("");
  const deferredMessages = useDeferredValue(input.messages);

  const analysis = useMemo(() => {
    if (!input.enabled || deferredMessages.length === 0) {
      return null;
    }
    return analyzePeerThreadForLens(deferredMessages);
  }, [input.enabled, deferredMessages]);

  useEffect(() => {
    if (!input.enabled || !analysis) {
      setCandidates([]);
      setCandidatesByMessageId({});
      setAnchorMessageId(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setCandidates(analysis.candidates);
      setCandidatesByMessageId(analysis.candidatesByMessageId);
      setAnchorMessageId(analysis.anchorMessageId);

      const key = `${analysis.anchorMessageId ?? "none"}:${analysis.candidates.map((c) => c.id).join(",")}`;
      if (key !== lastShownKey.current && analysis.candidates.length > 0) {
        lastShownKey.current = key;
        recordLensBubbleShown(analysis.candidates.map((c) => c.actionType));
      }
    }, LENS_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [analysis, input.enabled]);

  return {
    anchorMessageId,
    candidates,
    candidatesByMessageId,
    enabled: input.enabled,
  };
}
