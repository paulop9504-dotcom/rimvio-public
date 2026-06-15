import { extractPlaceEntities } from "@/lib/action-chat/clean-entity-text";
import { readDisplayAddress } from "@/lib/action-chat/normalize-address";
import type { PlaceIngestionSchema } from "@/lib/data-ingestion/types";

function parseOpeningStatus(text: string): PlaceIngestionSchema["opening_hours"]["status"] {
  if (/영업\s*중|영업중|open\s*now/i.test(text)) {
    return "open";
  }
  if (/브레이크|break/i.test(text)) {
    return "break";
  }
  if (/영업\s*종료|휴무|closed/i.test(text)) {
    return "closed";
  }
  return "unknown";
}

function parseOpeningStart(hours: string | null): string | null {
  if (!hours) {
    return null;
  }
  const match = hours.match(/(\d{1,2}:\d{2}|\d{1,2}\s*시)/);
  return match?.[1]?.replace(/\s*시/, ":00") ?? null;
}

function inferFeatures(text: string, branch: string | null): string[] {
  const features: string[] = [];
  if (branch) {
    features.push(branch);
  }
  if (/주차/i.test(text)) {
    features.push("주차");
  }
  if (/예약/i.test(text)) {
    features.push("예약");
  }
  if (/배달/i.test(text)) {
    features.push("배달");
  }
  if (/단체/i.test(text)) {
    features.push("단체석");
  }
  return features;
}

/** Rule-based normalizer — works offline without LLM. */
export function ruleParsePlaceIngestion(inputText: string): PlaceIngestionSchema | null {
  const info = extractPlaceEntities(inputText);
  const hasSignal = Boolean(info.name || info.address || info.phone || info.website || info.hours);
  if (!hasSignal) {
    return null;
  }

  const displayName = [info.name, info.branch].filter(Boolean).join(" ").trim() || null;

  return {
    name: displayName,
    address: readDisplayAddress(info.address),
    opening_hours: {
      start: parseOpeningStart(info.hours),
      status: info.is_open === true ? "open" : info.is_open === false ? "closed" : parseOpeningStatus(inputText),
      raw: info.hours,
    },
    phone: info.phone,
    homepage: info.website,
    features: inferFeatures(inputText, info.branch),
  };
}

export function normalizePlaceIngestionWire(raw: unknown): PlaceIngestionSchema | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const hoursRaw = record.opening_hours;
  const hours =
    hoursRaw && typeof hoursRaw === "object"
      ? (hoursRaw as Record<string, unknown>)
      : {};

  const status = hours.status;
  const normalizedStatus =
    status === "open" || status === "closed" || status === "break" ? status : "unknown";

  const features = Array.isArray(record.features)
    ? record.features.filter((item): item is string => typeof item === "string").slice(0, 12)
    : [];

  const schema: PlaceIngestionSchema = {
    name: typeof record.name === "string" ? record.name.trim() || null : null,
    address: typeof record.address === "string" ? record.address.trim() || null : null,
    opening_hours: {
      start: typeof hours.start === "string" ? hours.start : null,
      status: normalizedStatus,
      raw: typeof hours.raw === "string" ? hours.raw : null,
    },
    phone: typeof record.phone === "string" ? record.phone.trim() || null : null,
    homepage: typeof record.homepage === "string" ? record.homepage.trim() || null : null,
    features,
  };

  if (!schema.name && !schema.address && !schema.phone) {
    return null;
  }

  return schema;
}
