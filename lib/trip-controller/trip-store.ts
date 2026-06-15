import { evaluateTripStatus } from "@/lib/trip-controller/evaluate-trip-status";
import { parseFlightInfoFromText } from "@/lib/trip-controller/parse-flight-info";
import {
  buildPackingItems,
  resolvePackingTemplate,
} from "@/lib/trip-controller/packing-templates";
import { loadMatchingTemplates } from "@/lib/action-template/match-template";
import { mergeTemplatesRuleBased } from "@/lib/action-template/merge-template-rule";
import { instantiateTemplate } from "@/lib/action-template/instantiate-template";
import {
  getTemplateInstance,
  saveTemplateInstance,
  toggleTemplateInstanceItem,
} from "@/lib/action-template/template-instance-store";
import type {
  PackingList,
  TripEvaluated,
  TripRecord,
} from "@/lib/trip-controller/types";

const STORAGE_KEY = "rimvio-trips.v1";

let memoryStore: TripRecord[] = [];

function readJson(): TripRecord[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as TripRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(items: TripRecord[]) {
  if (typeof window === "undefined") {
    memoryStore = items;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function resetTripStoreForTests(items: TripRecord[] = []) {
  memoryStore = items;
  if (typeof window !== "undefined") {
    if (items.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

function withEvaluated(trip: TripRecord, now?: Date): TripEvaluated {
  const { status, minutesUntilDeparture } = evaluateTripStatus({
    departureIso: trip.departureIso,
    arrivalIso: trip.arrivalIso,
    now,
  });
  const items = trip.packing?.items ?? [];
  const done = items.filter((item) => item.checked).length;
  return {
    ...trip,
    status,
    minutesUntilDeparture,
    packingComplete: items.length > 0 && done === items.length,
    packingProgress: { done, total: items.length },
  };
}

export function listTripRecords(): TripRecord[] {
  return readJson();
}

export function listEvaluatedTrips(now?: Date): TripEvaluated[] {
  return readJson()
    .map((trip) => withEvaluated(trip, now))
    .filter((trip) => trip.status !== "ARRIVED")
    .sort((left, right) => left.departureIso.localeCompare(right.departureIso));
}

export function getTripById(tripId: string): TripRecord | null {
  return readJson().find((trip) => trip.id === tripId) ?? null;
}

export function getActiveTrip(now?: Date): TripEvaluated | null {
  const trips = listEvaluatedTrips(now);
  return trips[0] ?? null;
}

export function upsertTripFromMessage(input: {
  message: string;
  referenceDate: string;
  targetTimeIso?: string | null;
  placeName?: string | null;
  actionEventId?: string | null;
}): TripRecord | null {
  const blob = `${input.message} ${input.placeName ?? ""}`.trim();
  const templates = loadMatchingTemplates(input.message);
  const hasTravelSignal =
    templates.length > 0 ||
    /(?:공항|airport|항공|인천|김포|여행|trip|탑승|체크인|비행|출장|3박|4일)/iu.test(blob);

  if (!hasTravelSignal) {
    return null;
  }

  const flight =
    parseFlightInfoFromText({
      text: input.message,
      referenceDate: input.referenceDate,
      defaultOrigin: /김포/u.test(blob) ? "김포" : "인천",
      defaultDestination: /도쿄|tokyo/iu.test(blob) ? "도쿄" : "목적지",
    }) ?? null;

  const departureIso = input.targetTimeIso ?? flight?.departureIso ?? `${input.referenceDate}T10:00:00`;
  const destination =
    flight?.destination ??
    (/(?:도쿄|tokyo)/iu.test(blob) ? "도쿄" : templates[0]?.name ?? "여행");
  const airportLabel = input.placeName ?? (/김포/u.test(blob) ? "김포공항" : "인천공항");
  const now = new Date().toISOString();
  const { status } = evaluateTripStatus({ departureIso });

  let templateInstanceId: string | null = null;
  let packing: PackingList;

  if (templates.length > 0) {
    const merged = mergeTemplatesRuleBased({
      templates,
      message: input.message,
    });
    const instance = instantiateTemplate({
      templates,
      merged,
      message: input.message,
    });
    saveTemplateInstance(instance);
    templateInstanceId = instance.instance_id;
    packing = {
      tripId: "",
      templateId: instance.source_template_ids.join("+"),
      destinationLabel: instance.name,
      items: instance.items.map((item) => ({
        id: item.id,
        item: item.item,
        checked: item.checked,
      })),
      updatedAt: now,
    };
  } else {
    const legacyTemplate = resolvePackingTemplate(destination);
    packing = {
      tripId: "",
      templateId: legacyTemplate.id,
      destinationLabel: legacyTemplate.label,
      items: buildPackingItems(legacyTemplate),
      updatedAt: now,
    };
  }

  const record: TripRecord = {
    id: `trip-${Date.now()}`,
    title: flight
      ? `${flight.flightNumber} ${flight.origin}-${flight.destination}`
      : `${destination} 여행`,
    destination,
    departureIso,
    airportLabel,
    status,
    flight,
    packing,
    templateInstanceId,
    actionEventId: input.actionEventId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  record.packing!.tripId = record.id;

  const current = readJson();
  const existingIndex = current.findIndex(
    (trip) =>
      trip.departureIso === record.departureIso &&
      trip.airportLabel === record.airportLabel
  );
  const next =
    existingIndex >= 0
      ? current.map((trip, index) =>
          index === existingIndex
            ? {
                ...trip,
                ...record,
                id: trip.id,
                packing: trip.packing ?? record.packing,
                flight: record.flight ?? trip.flight,
                templateInstanceId: record.templateInstanceId ?? trip.templateInstanceId,
                updatedAt: now,
              }
            : trip
        )
      : [record, ...current].slice(0, 8);

  writeJson(next);
  return existingIndex >= 0 ? next[existingIndex]! : record;
}

export function attachFlightInfo(tripId: string, flight: TripRecord["flight"]): TripRecord | null {
  const current = readJson();
  const index = current.findIndex((trip) => trip.id === tripId);
  if (index < 0) {
    return null;
  }
  const updated: TripRecord = {
    ...current[index]!,
    flight,
    title: flight
      ? `${flight.flightNumber} ${flight.origin}-${flight.destination}`
      : current[index]!.title,
    updatedAt: new Date().toISOString(),
  };
  const next = [...current];
  next[index] = updated;
  writeJson(next);
  return updated;
}

export function ensurePackingList(tripId: string): PackingList | null {
  const current = readJson();
  const index = current.findIndex((trip) => trip.id === tripId);
  if (index < 0) {
    return null;
  }
  const trip = current[index]!;
  if (trip.templateInstanceId) {
    const instance = getTemplateInstance(trip.templateInstanceId);
    if (instance) {
      return {
        tripId,
        templateId: instance.source_template_ids.join("+"),
        destinationLabel: instance.name,
        items: instance.items.map((item) => ({
          id: item.id,
          item: item.item,
          checked: item.checked,
        })),
        updatedAt: instance.updatedAt,
      };
    }
  }
  if (trip.packing) {
    return trip.packing;
  }
  const template = resolvePackingTemplate(trip.destination);
  const packing: PackingList = {
    tripId,
    templateId: template.id,
    destinationLabel: template.label,
    items: buildPackingItems(template),
    updatedAt: new Date().toISOString(),
  };
  const updated = { ...trip, packing, updatedAt: packing.updatedAt };
  const next = [...current];
  next[index] = updated;
  writeJson(next);
  return packing;
}

export function togglePackingItem(input: {
  tripId: string;
  itemId: string;
}): { trip: TripEvaluated; toggledItem: string; justCompleted: boolean } | null {
  const current = readJson();
  const index = current.findIndex((trip) => trip.id === input.tripId);
  if (index < 0) {
    return null;
  }

  const trip = current[index]!;
  const beforeDone = (trip.packing?.items ?? []).filter((item) => item.checked).length;

  if (trip.templateInstanceId) {
    const instance = toggleTemplateInstanceItem({
      instanceId: trip.templateInstanceId,
      itemId: input.itemId,
    });
    if (!instance) {
      return null;
    }
    const items = instance.items.map((item) => ({
      id: item.id,
      item: item.item,
      checked: item.checked,
    }));
    const afterDone = items.filter((item) => item.checked).length;
    const toggled = items.find((item) => item.id === input.itemId);
    const updated: TripRecord = {
      ...trip,
      packing: {
        tripId: trip.id,
        templateId: instance.source_template_ids.join("+"),
        destinationLabel: instance.name,
        items,
        updatedAt: instance.updatedAt,
      },
      updatedAt: instance.updatedAt,
    };
    const next = [...current];
    next[index] = updated;
    writeJson(next);
    return {
      trip: withEvaluated(updated),
      toggledItem: toggled?.item ?? "",
      justCompleted: beforeDone < items.length && afterDone === items.length,
    };
  }

  if (!trip.packing) {
    return null;
  }

  const items = trip.packing.items.map((item) =>
    item.id === input.itemId ? { ...item, checked: !item.checked } : item
  );
  const afterDone = items.filter((item) => item.checked).length;
  const toggled = items.find((item) => item.id === input.itemId);

  const updated: TripRecord = {
    ...trip,
    packing: { ...trip.packing!, items, updatedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
  const next = [...current];
  next[index] = updated;
  writeJson(next);

  return {
    trip: withEvaluated(updated),
    toggledItem: toggled?.item ?? "",
    justCompleted: beforeDone < items.length && afterDone === items.length,
  };
}

export function serializeTripsForApi() {
  return listEvaluatedTrips().map((trip) => ({
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    departure_iso: trip.departureIso,
    airport_label: trip.airportLabel,
    status: trip.status,
    minutes_until_departure: trip.minutesUntilDeparture,
    packing_complete: trip.packingComplete,
    packing_progress: trip.packingProgress,
    flight: trip.flight,
  }));
}
