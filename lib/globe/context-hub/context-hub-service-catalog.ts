import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextHubKind } from "@/lib/globe/context-hub/context-hub-metadata";
import {
  listContextHubLinks,
  type ContextHubLink,
} from "@/lib/globe/context-hub/list-context-hub-links";
import { shouldOfferDepartureHub } from "@/lib/globe/should-offer-departure-hub";
import type { DepartureHubOption } from "@/lib/globe/suggest-departure-hub-options";
import { suggestDepartureHubOptions } from "@/lib/globe/suggest-departure-hub-options";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { buildContextHubAiSearchHandoff } from "@/lib/globe/context-hub/build-context-hub-ai-search-handoff";
import {
  isTicketLikeContext,
  readContextTicketArtifact,
} from "@/lib/globe/context-hub/read-context-ticket-artifact";
import { isLodgingHubEnabled } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { ticketPrimaryLabel, detectTicketBrand } from "@/lib/resolvers/ticket-deep-links";

/** Plug-in resource service — not a globe context. */
export type ContextHubServiceId =
  | "ticket"
  | "flight"
  | "lodging"
  | "rental_car"
  | "ai_search";

export type ContextHubServiceDef = {
  id: ContextHubServiceId;
  /** Implemented storage kind on globe events. */
  kind: ContextHubKind | null;
  labelKo: string;
  shortLabelKo: string;
  implemented: boolean;
};

export const CONTEXT_HUB_SERVICE_CATALOG: readonly ContextHubServiceDef[] = [
  {
    id: "ticket",
    kind: null,
    labelKo: "티켓",
    shortLabelKo: "티켓",
    implemented: true,
  },
  {
    id: "flight",
    kind: "departure_airport",
    labelKo: "항공",
    shortLabelKo: "항공",
    implemented: true,
  },
  {
    id: "lodging",
    kind: null,
    labelKo: "숙소",
    shortLabelKo: "숙소",
    implemented: true,
  },
  {
    id: "rental_car",
    kind: null,
    labelKo: "렌트카",
    shortLabelKo: "렌트카",
    implemented: false,
  },
  {
    id: "ai_search",
    kind: null,
    labelKo: "AI 검색",
    shortLabelKo: "AI",
    implemented: true,
  },
] as const;

export type ContextHubServiceRow = {
  serviceId: ContextHubServiceId;
  labelKo: string;
  shortLabelKo: string;
  implemented: boolean;
  /** This context can use this hub service. */
  offered: boolean;
  connected: boolean;
  link: ContextHubLink | null;
  flightOptions: readonly DepartureHubOption[];
  handoffHref: string | null;
  handoffLabelKo: string | null;
};

function resolveContextPlace(event: EventCandidate): string {
  const pin = findPersonalGlobePinByEventId(event.id);
  const plan = readPlanContextFromEvent(event);
  return (
    pin?.placeLabel?.trim() ||
    plan?.place?.trim() ||
    event.place?.trim() ||
    event.title.trim() ||
    "맥락"
  );
}

function isTravelContext(event: EventCandidate): boolean {
  if (event.category === "travel") {
    return true;
  }
  if (event.metadata?.feedPlanEnabled === true) {
    return true;
  }
  return shouldOfferDepartureHub(event);
}

function isServiceOffered(serviceId: ContextHubServiceId, event: EventCandidate): boolean {
  switch (serviceId) {
    case "ticket":
      return isTicketLikeContext(event);
    case "flight":
      return shouldOfferDepartureHub(event);
    case "lodging":
      return isTravelContext(event);
    case "rental_car":
      return isTravelContext(event);
    case "ai_search":
      return true;
    default:
      return false;
  }
}

export type ContextHubServicesForEvent = {
  eventId: string;
  contextPlace: string;
  services: ContextHubServiceRow[];
};

/** Hub services for one selected context — never lists other contexts.
 *  @see docs/GLOBE_HUB_RESOURCE.md — Hub does not rank; emits Resources for ranker.
 */
export function listContextHubServicesForEvent(
  event: EventCandidate | null | undefined,
): ContextHubServicesForEvent | null {
  if (!event) {
    return null;
  }

  const place = resolveContextPlace(event);
  const flightOptions = shouldOfferDepartureHub(event)
    ? suggestDepartureHubOptions({ destinationPlace: place })
    : [];

  const services: ContextHubServiceRow[] = CONTEXT_HUB_SERVICE_CATALOG.map((def) => {
    const offered = isServiceOffered(def.id, event);
    const ticketArtifact = def.id === "ticket" ? readContextTicketArtifact(event) : null;
    const link =
      def.kind === "departure_airport"
        ? (listContextHubLinks(event).find((row) => row.kind === def.kind) ?? null)
        : null;
    const aiHandoff =
      def.id === "ai_search" && offered
        ? buildContextHubAiSearchHandoff(event)
        : null;

    const ticketUrl = ticketArtifact?.actionUrl ?? null;
    const ticketBrand = ticketUrl ? detectTicketBrand(ticketUrl, "") : null;

    return {
      serviceId: def.id,
      labelKo: def.labelKo,
      shortLabelKo: def.shortLabelKo,
      implemented: def.implemented,
      offered,
      connected:
        def.id === "ticket"
          ? Boolean(ticketArtifact?.actionUrl || ticketArtifact?.qrPreviewUrl)
          : def.id === "lodging"
            ? isLodgingHubEnabled(event)
            : def.id === "ai_search"
              ? Boolean(aiHandoff)
              : Boolean(link),
      link:
        def.id === "ticket" && ticketArtifact
          ? {
              eventId: event.id,
              kind: "departure_airport",
              label: ticketArtifact.labelKo,
              shortLabel: ticketArtifact.qrPreviewUrl ? "QR" : ticketArtifact.labelKo,
              airportIata: null,
              actionUrl: ticketArtifact.actionUrl,
              actionLabelKo: ticketArtifact.qrPreviewUrl
                ? "QR 보기"
                : ticketBrand
                  ? ticketPrimaryLabel(ticketBrand)
                  : "티켓 열기",
            }
          : link,
      flightOptions: def.id === "flight" ? flightOptions : [],
      handoffHref:
        def.id === "ticket" && ticketArtifact?.qrPreviewUrl
          ? ticketArtifact.qrPreviewUrl
          : aiHandoff?.href ?? null,
      handoffLabelKo:
        def.id === "ticket" && ticketArtifact?.qrPreviewUrl
          ? "QR 보기"
          : aiHandoff?.actionLabelKo ?? null,
    };
  }).filter((row) => row.offered);

  if (services.length === 0) {
    return null;
  }

  return {
    eventId: event.id,
    contextPlace: place,
    services,
  };
}
