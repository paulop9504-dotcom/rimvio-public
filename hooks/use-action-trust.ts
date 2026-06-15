"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACTION_TRUST_UPDATED,
  readActionTrustState,
  type ActionTrustState,
} from "@/lib/preferences/action-trust";

export function useActionTrust() {
  const [state, setState] = useState<ActionTrustState>(() => readActionTrustState());

  const sync = useCallback(() => {
    setState(readActionTrustState());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(ACTION_TRUST_UPDATED, sync);
    return () => window.removeEventListener(ACTION_TRUST_UPDATED, sync);
  }, [sync]);

  return state;
}
