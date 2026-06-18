"use client";

import { useEffect, useRef } from "react";
import { acquireTicketScanSurface } from "@/lib/globe/ticket-scan-surface";
import { isNativeShell } from "@/lib/native-bridge/rimvio-native-bridge";
import { RimvioMainSurface } from "@/lib/native-bridge/rimvio-main-surface";

/** Keeps screen awake and scan-surface styling while QR viewer is open. */
export function useTicketScanSurface(active: boolean) {
  const handleRef = useRef<Awaited<ReturnType<typeof acquireTicketScanSurface>> | null>(
    null,
  );
  const nativeBrightnessRef = useRef(false);

  useEffect(() => {
    if (!active) {
      handleRef.current?.release();
      handleRef.current = null;
      if (nativeBrightnessRef.current) {
        nativeBrightnessRef.current = false;
        void RimvioMainSurface.setScanBrightnessEnabled({ enabled: false });
      }
      return;
    }

    let cancelled = false;
    if (isNativeShell()) {
      nativeBrightnessRef.current = true;
      void RimvioMainSurface.setScanBrightnessEnabled({ enabled: true });
    }

    void acquireTicketScanSurface().then((handle) => {
      if (cancelled) {
        handle.release();
        return;
      }
      handleRef.current?.release();
      handleRef.current = handle;
    });

    return () => {
      cancelled = true;
      handleRef.current?.release();
      handleRef.current = null;
      if (nativeBrightnessRef.current) {
        nativeBrightnessRef.current = false;
        void RimvioMainSurface.setScanBrightnessEnabled({ enabled: false });
      }
    };
  }, [active]);
}
