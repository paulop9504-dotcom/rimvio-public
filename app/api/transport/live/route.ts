import { NextResponse } from "next/server";
import {
  buildTransportLiveCard,
  buildTransportLiveData,
  fetchTransportLiveArrivals,
  pickNextArrival,
  transportLiveActionsToLinkItems,
} from "@/lib/transport/transport-live-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      location?: string;
      stopId?: string;
      routeNumber?: string | null;
      calendarTitle?: string;
    };

    const arrivals = await fetchTransportLiveArrivals({
      message: body.message,
      location: body.location,
      stopId: body.stopId,
      routeNumber: body.routeNumber,
    });

    const next = pickNextArrival(arrivals);
    if (!next) {
      return NextResponse.json({ error: "no_arrivals" }, { status: 404 });
    }

    const data = buildTransportLiveData(next);
    const card = buildTransportLiveCard({
      data,
      calendarTitle: body.calendarTitle,
    });

    return NextResponse.json({
      card,
      actions: transportLiveActionsToLinkItems(card, body.calendarTitle),
      summary: `[${data.route}] ${data.minutes_until}분 후 도착`,
    });
  } catch {
    return NextResponse.json({ error: "transport_live_failed" }, { status: 500 });
  }
}
