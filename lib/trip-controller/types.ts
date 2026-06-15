/** Trip lifecycle — drives Action Dock composition. */
export type TripStatus =
  | "PREPARING"
  | "DEPARTURE_24H"
  | "AIRPORT_TRANSIT"
  | "BOARDING"
  | "ARRIVED";

export type FlightInfo = {
  flightNumber: string;
  airline?: string | null;
  origin: string;
  destination: string;
  departureIso: string;
  arrivalIso?: string | null;
  gate?: string | null;
  terminal?: string | null;
  seat?: string | null;
  pnr?: string | null;
  checkInUrl?: string | null;
  boardingPassUrl?: string | null;
  statusLabel?: string | null;
};

export type PackingListItem = {
  id: string;
  item: string;
  checked: boolean;
};

export type PackingList = {
  tripId: string;
  templateId: string;
  destinationLabel: string;
  items: PackingListItem[];
  updatedAt: string;
};

export type TripRecord = {
  id: string;
  title: string;
  destination: string;
  departureIso: string;
  arrivalIso?: string | null;
  airportLabel: string;
  status: TripStatus;
  flight: FlightInfo | null;
  packing: PackingList | null;
  templateInstanceId?: string | null;
  actionEventId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FlightStatusCardWire = {
  tripId: string;
  card: {
    title: string;
    status: string;
    info_lines: string[];
  };
  main_action: {
    type: "TICKET_QR" | "CHECKIN" | "REMINDER" | "GATE";
    label: string;
    url?: string | null;
  };
  shadow_actions: Array<{
    type: "LINK" | "INFO";
    label: string;
    url?: string | null;
    prompt?: string;
  }>;
};

export type PackingChecklistWire = {
  tripId: string;
  destinationLabel: string;
  list: Array<{ id: string; item: string; checked: boolean }>;
  completionMessage?: string | null;
  promoteTaxi?: boolean;
};

export type TripEvaluated = TripRecord & {
  minutesUntilDeparture: number;
  packingComplete: boolean;
  packingProgress: { done: number; total: number };
};
