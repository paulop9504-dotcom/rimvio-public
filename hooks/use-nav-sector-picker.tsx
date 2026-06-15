"use client";

import { useCallback, useState } from "react";
import { NavSectorSheet } from "@/components/nav-sector-sheet";
import { runFeedLinkAction } from "@/lib/feed/run-feed-link-action";
import type { Copy } from "@/lib/i18n/types";
import {
  isNavSectorAction,
  recordNavSectorUse,
  resolveNavSectorDestination,
  type NavSectorDestination,
  type NavSectorOption,
} from "@/lib/navigation/nav-sector";
import type { LinkActionItem, LinkRow } from "@/types/database";

type NavSectorPick = {
  action: LinkActionItem;
  destination: NavSectorDestination;
  placeLabel: string;
};

type UseNavSectorPickerOptions = {
  copy: Copy;
  resolveLink: (action: LinkActionItem) => LinkRow;
};

export function useNavSectorPicker({ copy, resolveLink }: UseNavSectorPickerOptions) {
  const [pick, setPick] = useState<NavSectorPick | null>(null);

  const requestNavSector = useCallback(
    (action: LinkActionItem, link?: LinkRow | null, placeLabel?: string | null) => {
      const destination = resolveNavSectorDestination(action, link);
      setPick({
        action,
        destination,
        placeLabel:
          placeLabel?.trim() ||
          destination.placeName?.trim() ||
          destination.query ||
          action.label,
      });
    },
    []
  );

  const shouldOpenNavSector = useCallback((action: LinkActionItem) => {
    return isNavSectorAction(action);
  }, []);

  const launchNavSectorOption = useCallback(
    (option: NavSectorOption, action: LinkActionItem) => {
      recordNavSectorUse(option.id);
      void runFeedLinkAction(
        {
          ...action,
          href: option.href,
          payload: {
            ...(action.payload ?? {}),
            ...(option.fallbackHref ? { fallbackHref: option.fallbackHref } : {}),
            navSectorResolved: option.id,
          },
        },
        resolveLink(action),
        copy
      );
    },
    [copy, resolveLink]
  );

  const navSectorSheet = (
    <NavSectorSheet
      open={Boolean(pick)}
      onOpenChange={(open) => {
        if (!open) {
          setPick(null);
        }
      }}
      destination={pick?.destination ?? null}
      placeLabel={pick?.placeLabel}
      onSelect={(option) => {
        if (!pick) {
          return;
        }

        launchNavSectorOption(option, pick.action);
        setPick(null);
      }}
    />
  );

  return {
    pick,
    requestNavSector,
    shouldOpenNavSector,
    launchNavSectorOption,
    navSectorSheet,
  };
}
