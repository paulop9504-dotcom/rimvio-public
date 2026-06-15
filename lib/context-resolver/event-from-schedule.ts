import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import type { PersistentEvent } from "@/lib/context-resolver/types";

export function persistentEventFromExtracted(
  extracted: ConfirmationExtractedData,
  options?: { id?: string; title?: string; originHint?: string | null }
): PersistentEvent | null {
  const location = extracted.place_name ?? extracted.address;
  const startTime = extracted.datetime;

  if (!location?.trim() || !startTime?.trim()) {
    return null;
  }

  return {
    id: options?.id ?? `event-${location}-${startTime}`,
    title: options?.title ?? `${location} 미팅`,
    start_time: startTime,
    location: location.trim(),
    meeting_url: extracted.url ?? null,
    origin_hint: options?.originHint ?? null,
  };
}

export function shouldUseJITEventDelivery(extracted: ConfirmationExtractedData): boolean {
  return Boolean(
    (extracted.place_name?.trim() || extracted.address?.trim()) && extracted.datetime?.trim()
  );
}
