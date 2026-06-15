import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";

const STORAGE_KEY = "rimvio.personal-globe-pins.v1";

let memoryPins: PersonalGlobePin[] = [];

export const PERSONAL_GLOBE_PINS_UPDATED = "rimvio-personal-globe-pins-updated";

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PERSONAL_GLOBE_PINS_UPDATED));
  }
}

function readAll(): PersonalGlobePin[] {
  if (typeof window === "undefined") {
    return memoryPins;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PersonalGlobePin[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(pins: PersonalGlobePin[]) {
  memoryPins = pins;
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {
    // ignore quota
  }
  emitUpdated();
}

export function listPersonalGlobePins(): PersonalGlobePin[] {
  const rows = readAll();
  memoryPins = rows;
  return [...rows].sort(
    (left, right) =>
      Date.parse(right.createdAtIso) - Date.parse(left.createdAtIso),
  );
}

export function findPersonalGlobePinByEventId(
  eventId: string,
): PersonalGlobePin | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }
  return listPersonalGlobePins().find((pin) => pin.eventId === key) ?? null;
}

export function upsertPersonalGlobePin(pin: PersonalGlobePin): PersonalGlobePin {
  const rows = listPersonalGlobePins();
  const index = rows.findIndex(
    (row) => row.pinId === pin.pinId || row.eventId === pin.eventId,
  );
  const next = [...rows];
  if (index >= 0) {
    next[index] = pin;
  } else {
    next.unshift(pin);
  }
  writeAll(next.slice(0, 120));
  return pin;
}

export function removePersonalGlobePinByEventId(eventId: string): boolean {
  const key = eventId.trim();
  if (!key) {
    return false;
  }
  const rows = listPersonalGlobePins();
  const next = rows.filter((row) => row.eventId !== key);
  if (next.length === rows.length) {
    return false;
  }
  writeAll(next);
  return true;
}

export function removePersonalGlobePinByPinId(pinId: string): boolean {
  const key = pinId.trim();
  if (!key) {
    return false;
  }
  const rows = listPersonalGlobePins();
  const next = rows.filter((row) => row.pinId !== key);
  if (next.length === rows.length) {
    return false;
  }
  writeAll(next);
  return true;
}

export function resetPersonalGlobePinsForTests(pins: PersonalGlobePin[] = []) {
  memoryPins = pins;
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
