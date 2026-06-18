import { validateLinkAction } from "@/lib/actions/action-validator";
import { readDisplayAddress, readNavAddress } from "@/lib/action-chat/normalize-address";
import { buildNaverWebSearchHref } from "@/lib/actions/search-urls";
import { buildTmapNavigateHref } from "@/lib/actions/domain-deep-links";
import { sanitizePlaceNameForNavigation } from "@/lib/action-chat/resolve-navigation-place";
import type {
  EntityActionWire,
  ExtractedPlaceInfo,
} from "@/lib/action-chat/entity-cleaner-types";
import { createCallAction, createOpenAction } from "@/lib/enrichers/action-factory";
import {
  buildContactActionLabel,
  isTelHref,
  toDialPrepTelHref,
} from "@/lib/enrichers/extract-phone";
import {
  buildNaverMapSearchHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import type { LinkActionItem } from "@/types/database";

function buildSummary(info: ExtractedPlaceInfo) {
  const label = [info.name, info.branch].filter(Boolean).join(" ").trim();
  if (label) {
    return `${label} 정보`;
  }
  const displayAddress = readDisplayAddress(info.address);
  if (displayAddress) {
    return `${displayAddress.slice(0, 12)}… 정보`;
  }
  return "장소 정보";
}

function readEntityNavTarget(info: ExtractedPlaceInfo) {
  const raw = info.name?.trim() || info.branch?.trim() || "";
  const placeName = sanitizePlaceNameForNavigation(raw, raw) ?? raw;
  const navAddress = readNavAddress(info.address);
  return { placeName, navAddress };
}

export function buildEntityActionWires(info: ExtractedPlaceInfo): EntityActionWire[] {
  const actions: EntityActionWire[] = [];

  if (info.phone) {
    actions.push({
      label: buildContactActionLabel(info.phone),
      icon: "phone",
      url: toDialPrepTelHref(info.phone),
    });
  }

  const { placeName, navAddress } = readEntityNavTarget(info);
  const navHref = buildTmapNavigateHref(placeName, navAddress);
  if (navHref) {
    actions.push({
      label: "네비게이션",
      icon: "navigation",
      url: navHref,
    });
  }

  if (info.website) {
    actions.push({
      label: "홈페이지",
      icon: "globe",
      url: info.website,
    });
  }

  if (actions.length < 4 && (info.hours || info.address)) {
    const facilityQuery = [info.name, "주차", "편의시설"].filter(Boolean).join(" ");
    actions.push({
      label: "편의/시설",
      icon: "check",
      url: buildNaverWebSearchHref(facilityQuery),
    });
  }

  return actions.slice(0, 4);
}

export function entityWiresToLinkItems(wires: EntityActionWire[]): LinkActionItem[] {
  return wires.map((wire, index) => {
    const payload = {
      entityArchitect: true,
      entityPrimary: index === 0,
      icon: wire.icon,
    };

    if (isTelHref(wire.url)) {
      const phone = wire.url.replace(/^tel(?:prompt)?:/i, "").replace(/^\+82/, "0");
      const call = createCallAction(phone, wire.label);
      return validateLinkAction({
        ...call,
        payload: { ...call.payload, ...payload },
      });
    }

    const isNavigation = wire.label === "네비게이션";
    const placeName =
      decodeURIComponent(wire.url.match(/[?&]name=([^&]+)/)?.[1]?.replace(/\+/g, " ") ?? "") ||
      "";
    const navAddress =
      decodeURIComponent(wire.url.match(/address=([^&]+)/)?.[1]?.replace(/\+/g, " ") ?? "") ||
      "";
    const navFallbackQuery =
      [placeName, navAddress].filter(Boolean).join(" ").trim() ||
      decodeURIComponent(wire.url.match(/[?&]q=([^&]+)/)?.[1]?.replace(/\+/g, " ") ?? "") ||
      wire.url;

    return validateLinkAction(
      createOpenAction({
        label: wire.label,
        href: wire.url,
        icon: wire.icon,
        copyText: isNavigation ? navFallbackQuery : wire.url,
        fallbackHref: isNavigation ? buildNaverMapSearchWebHref(navFallbackQuery) : undefined,
        contextBoost: isNavigation ? "installed-app" : undefined,
        payload: {
          ...payload,
          ...(isNavigation
            ? {
                navSector: true,
                entityNavigate: true,
                navPlaceName: placeName || null,
                navAddress: navAddress || null,
              }
            : {}),
        },
      })
    );
  });
}

export function buildEntityArchitectFromInfo(info: ExtractedPlaceInfo) {
  const actions = buildEntityActionWires(info);
  return {
    wire: {
      summary: buildSummary(info),
      extracted_info: info,
      actions,
    },
    actions: entityWiresToLinkItems(actions),
  };
}
