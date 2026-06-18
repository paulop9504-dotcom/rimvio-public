import { buildGoogleCalendarTimedHref } from "@/lib/actions/schedule-link-execution";
import { buildNaverMapSearchHref, buildNaverMapSearchWebHref } from "@/lib/resolvers/deep-links";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import type { LinkActionItem } from "@/types/database";
import type {
  TransportArrivalCandidate,
  TransportLiveCard,
  TransportLiveData,
} from "@/lib/transport/transport-live-types";

const TRANSIT_QUERY =
  /버스|지하철|막차|언제\s*와|도착|몇\s*분|정류|노선|교통|타야|출발|대중교통/i;

const ROUTE_PATTERN = /(?:급행\s*)?(\d+)\s*번|(\d+)번\s*버스|버스\s*(\d+)/i;

function padTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isTransitLiveQuery(message: string) {
  return TRANSIT_QUERY.test(message.trim());
}

export function parseTransitQuery(message: string) {
  const trimmed = message.trim();
  const routeMatch = trimmed.match(ROUTE_PATTERN);
  const routeNumber = routeMatch?.[1] ?? routeMatch?.[2] ?? routeMatch?.[3] ?? null;

  const locationMatch = trimmed.match(
    /([가-힣A-Za-z0-9\s]+(?:역|정류장|출구|사거리|입구))\s*(?:근처|앞|에서)?/
  );

  return {
    routeNumber,
    routeLabel: routeNumber ? `${routeNumber}번` : null,
    location: locationMatch?.[1]?.trim() ?? "대전역 3번 출구",
    stopId: "DJ-DAEJEON-STATION-03",
  };
}

function mockArrivals(input: {
  location: string;
  stopId: string;
  routeNumber?: string | null;
}): TransportArrivalCandidate[] {
  const now = new Date();
  const base: TransportArrivalCandidate[] = [
    {
      route_id: "102",
      route: "102번",
      minutes_until: 3,
      stops_away: 2,
      arrival_time: padTime(addMinutes(now, 3)),
      location: input.location,
      stop_id: input.stopId,
    },
    {
      route_id: "601",
      route: "급행1번",
      minutes_until: 7,
      stops_away: 4,
      arrival_time: padTime(addMinutes(now, 7)),
      location: input.location,
      stop_id: input.stopId,
    },
    {
      route_id: "314",
      route: "314번",
      minutes_until: 11,
      stops_away: 6,
      arrival_time: padTime(addMinutes(now, 11)),
      location: input.location,
      stop_id: input.stopId,
    },
  ];

  if (input.routeNumber) {
    const preferred = base.find((item) => item.route_id === input.routeNumber);
    if (preferred) {
      return [preferred, ...base.filter((item) => item.route_id !== input.routeNumber)];
    }

    return [
      {
        route_id: input.routeNumber,
        route: input.routeNumber.includes("급행") ? input.routeNumber : `${input.routeNumber}번`,
        minutes_until: 2,
        stops_away: 1,
        arrival_time: padTime(addMinutes(now, 2)),
        location: input.location,
        stop_id: input.stopId,
      },
      ...base,
    ];
  }

  return base;
}

export function pickNextArrival(
  arrivals: TransportArrivalCandidate[]
): TransportArrivalCandidate | null {
  if (arrivals.length === 0) {
    return null;
  }

  return [...arrivals].sort((a, b) => a.minutes_until - b.minutes_until)[0] ?? null;
}

export function buildTransportStatus(arrival: TransportArrivalCandidate) {
  if (arrival.minutes_until <= 2) {
    return `곧 도착 (${arrival.stops_away}정거장 전)`;
  }

  return `${arrival.minutes_until}분 후 도착`;
}

export function buildTransportLiveSummary(data: TransportLiveData) {
  return `[${data.route}] ${data.minutes_until}분 후 도착`;
}

export async function fetchTransportLiveArrivals(input: {
  message?: string;
  location?: string;
  stopId?: string;
  routeNumber?: string | null;
}): Promise<TransportArrivalCandidate[]> {
  return buildTransportLiveArrivals(input);
}

export function buildTransportLiveArrivals(input: {
  message?: string;
  location?: string;
  stopId?: string;
  routeNumber?: string | null;
}): TransportArrivalCandidate[] {
  const parsed = input.message ? parseTransitQuery(input.message) : null;
  const location = input.location ?? parsed?.location ?? "대전역 3번 출구";
  const stopId = input.stopId ?? parsed?.stopId ?? "DJ-DAEJEON-STATION-03";
  const routeNumber = input.routeNumber ?? parsed?.routeNumber ?? null;

  return mockArrivals({ location, stopId, routeNumber });
}

export function buildTransportLiveData(
  arrival: TransportArrivalCandidate,
  source: TransportLiveData["source"] = "mock"
): TransportLiveData {
  return {
    route: arrival.route,
    status: buildTransportStatus(arrival),
    arrival_time: arrival.arrival_time,
    minutes_until: arrival.minutes_until,
    location: arrival.location,
    stop_id: arrival.stop_id,
    route_id: arrival.route_id,
    fetched_at: new Date().toISOString(),
    source,
  };
}

export function buildTransportLiveCard(input: {
  data: TransportLiveData;
  calendarTitle?: string;
}): TransportLiveCard {
  const mapQuery = `${input.data.location} ${input.data.route} 버스`;
  const calendarStart = new Date();
  calendarStart.setHours(
    Number.parseInt(input.data.arrival_time.split(":")[0] ?? "0", 10),
    Number.parseInt(input.data.arrival_time.split(":")[1] ?? "0", 10),
    0,
    0
  );
  if (calendarStart.getTime() <= Date.now()) {
    calendarStart.setDate(calendarStart.getDate() + 1);
  }

  return {
    card_type: "TRANSPORT_LIVE",
    data: input.data,
    actions: [
      { label: "실시간 갱신", icon: "refresh", action: "UPDATE_LIVE_DATA" },
      {
        label: "지도 보기",
        icon: "map",
        action: "DEEP_LINK",
        url: buildNaverMapSearchHref(mapQuery),
      },
      {
        label: "일정 자동 등록",
        icon: "calendar",
        action: "ADD_TO_CALENDAR",
        url: buildGoogleCalendarTimedHref({
          title: input.calendarTitle ?? `${input.data.route} 탑승`,
          details: `${input.data.location} · ${input.data.status}`,
          start: calendarStart,
          durationMinutes: 20,
        }),
      },
    ],
  };
}

export function transportLiveActionsToLinkItems(
  card: TransportLiveCard,
  calendarTitle?: string
): LinkActionItem[] {
  return card.actions.map((action) => {
    if (action.action === "UPDATE_LIVE_DATA") {
      return createOpenAction({
        label: action.label,
        href: "#transport-live-refresh",
        icon: "refresh",
        payload: {
          transportLiveRefresh: true,
          stopId: card.data.stop_id,
          routeId: card.data.route_id,
          location: card.data.location,
          icon: action.icon,
        },
      });
    }

    if (action.action === "ADD_TO_CALENDAR") {
      const start = new Date();
      const [hour, minute] = card.data.arrival_time.split(":");
      start.setHours(Number.parseInt(hour ?? "0", 10), Number.parseInt(minute ?? "0", 10), 0, 0);
      if (start.getTime() <= Date.now()) {
        start.setDate(start.getDate() + 1);
      }

      return createOpenAction({
        label: action.label,
        href:
          action.url ??
          buildGoogleCalendarTimedHref({
            title: calendarTitle ?? `${card.data.route} 탑승`,
            details: `${card.data.location} · ${card.data.status}`,
            start,
            durationMinutes: 20,
          }),
        icon: "calendar",
        copyText: calendarTitle ?? `${card.data.route} 탑승`,
        payload: { transportLiveCalendar: true, icon: action.icon },
      });
    }

    const mapQuery = `${card.data.location} ${card.data.route} 버스`;
    return createOpenAction({
      label: action.label,
      href: action.url ?? buildNaverMapSearchHref(mapQuery),
      icon: "map",
      copyText: mapQuery,
      fallbackHref: buildNaverMapSearchWebHref(mapQuery),
      payload: { icon: action.icon },
    });
  });
}

export function buildTransportLiveOrchestratorPayload(input: {
  message: string;
  calendarTitle?: string;
  location?: string;
  stopId?: string;
  routeNumber?: string | null;
}) {
  const arrivals = buildTransportLiveArrivals({
    message: input.message,
    location: input.location,
    stopId: input.stopId,
    routeNumber: input.routeNumber,
  });
  const next = pickNextArrival(arrivals);
  if (!next) {
    return null;
  }

  const data = buildTransportLiveData(next);
  const card = buildTransportLiveCard({ data, calendarTitle: input.calendarTitle });

  return {
    card,
    summary: buildTransportLiveSummary(data),
    actions: transportLiveActionsToLinkItems(card, input.calendarTitle),
  };
}

export async function refreshTransportLivePayload(input: {
  stopId?: string;
  routeNumber?: string | null;
  location?: string;
  calendarTitle?: string;
}) {
  const arrivals = await fetchTransportLiveArrivals(input);
  const next = pickNextArrival(arrivals);
  if (!next) {
    return null;
  }

  const data = buildTransportLiveData(next);
  const card = buildTransportLiveCard({ data, calendarTitle: input.calendarTitle });

  return {
    card,
    summary: buildTransportLiveSummary(data),
    actions: transportLiveActionsToLinkItems(card, input.calendarTitle),
  };
}
