export type TransportLiveCardType = "TRANSPORT_LIVE";

export type TransportLiveData = {
  route: string;
  status: string;
  arrival_time: string;
  minutes_until: number;
  location: string;
  stop_id: string;
  route_id: string;
  fetched_at: string;
  source: "mock" | "openapi";
};

export type TransportLiveActionWire = {
  label: string;
  icon: "refresh" | "map" | "calendar" | string;
  url?: string;
  action?: "UPDATE_LIVE_DATA" | "ADD_TO_CALENDAR" | "DEEP_LINK";
};

export type TransportLiveCard = {
  card_type: TransportLiveCardType;
  data: TransportLiveData;
  actions: TransportLiveActionWire[];
};

export type TransportArrivalCandidate = {
  route_id: string;
  route: string;
  minutes_until: number;
  stops_away: number;
  arrival_time: string;
  location: string;
  stop_id: string;
};
