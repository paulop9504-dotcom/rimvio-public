import type { FlightInfo, FlightStatusCardWire, TripEvaluated } from "@/lib/trip-controller/types";

function formatDepartureTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} 출발`;
}

/** Dynamic flight card — only what matters right now. */
export function buildFlightStatusCard(trip: TripEvaluated): FlightStatusCardWire | null {
  const flight = trip.flight;
  if (!flight) {
    return null;
  }

  const title = `${flight.flightNumber} ${flight.origin}-${flight.destination}`;
  const infoLines = [formatDepartureTime(flight.departureIso)];
  if (flight.gate) {
    infoLines.push(`게이트 ${flight.gate}번`);
  }
  if (flight.seat) {
    infoLines.push(`좌석 ${flight.seat}`);
  }

  const minutes = trip.minutesUntilDeparture;

  if (minutes > 72 * 60) {
    return {
      tripId: trip.id,
      card: { title, status: "체크인 알림 대기", info_lines: infoLines },
      main_action: {
        type: "REMINDER",
        label: "체크인 알림 설정",
        url: null,
      },
      shadow_actions: [
        {
          type: "INFO",
          label: "수하물 규정",
          prompt: `${flight.airline ?? flight.flightNumber} 수하물 규정 알려줘`,
        },
      ],
    };
  }

  if (minutes > 24 * 60) {
    return {
      tripId: trip.id,
      card: { title, status: "온라인 체크인 가능", info_lines: infoLines },
      main_action: {
        type: "CHECKIN",
        label: "온라인 체크인",
        url: flight.checkInUrl ?? "https://www.koreanair.com/check-in",
      },
      shadow_actions: [
        {
          type: "LINK",
          label: "항공편 상태",
          url: flight.checkInUrl ?? undefined,
        },
      ],
    };
  }

  const status = flight.statusLabel ?? (flight.gate ? "게이트 오픈" : "탑승 준비");
  return {
    tripId: trip.id,
    card: { title, status, info_lines: infoLines },
    main_action: {
      type: "TICKET_QR",
      label: "탑승권 열기",
      url: flight.boardingPassUrl ?? flight.checkInUrl,
    },
    shadow_actions: [
      {
        type: "LINK",
        label: "게이트 정보",
        prompt: `${flight.flightNumber} 게이트 확인해줘`,
      },
      {
        type: "INFO",
        label: "수하물 규정",
        prompt: "수하물 규정 알려줘",
      },
    ],
  };
}

export function flightInfoFromTrip(trip: TripEvaluated): FlightInfo | null {
  return trip.flight;
}
