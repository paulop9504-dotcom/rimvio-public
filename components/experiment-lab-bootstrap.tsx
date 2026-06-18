"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
/** ?lab=fresh — wipe local links/telemetry and load experiment feed. */
export function ExperimentLabBootstrap() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("lab") !== "fresh") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("lab");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router, searchParams]);

  return null;
}
