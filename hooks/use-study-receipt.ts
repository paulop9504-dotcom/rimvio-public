"use client";

import { useMemo } from "react";
import {
  buildStudyReceiptFromLink,
  shouldShowStudyReceipt,
} from "@/lib/study/build-study-receipt";
import type { LinkRow } from "@/types/database";

export { shouldShowStudyReceipt };

export function useStudyReceipt(link: LinkRow, enabled: boolean) {
  return useMemo(() => {
    if (!enabled || !shouldShowStudyReceipt(link)) {
      return null;
    }

    return buildStudyReceiptFromLink(link);
  }, [enabled, link]);
}
