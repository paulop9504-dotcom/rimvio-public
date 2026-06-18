import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import { buildDynamicContextPromptBlock } from "@/lib/context-resolver/format-context-prompt";
import { persistentEventFromExtracted } from "@/lib/context-resolver/event-from-schedule";
import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";

const CONTEXT_HINT =
  /(?:날씨|교통|출발|길찾|미팅|회의|일정|갈\s*거|가\s*야|이동|택시|버스|지하철|우산|비\s*올)/i;

export async function resolveOrchestratorContextBlock(input: {
  message: string;
  referenceDate: string;
  originHint?: string | null;
}): Promise<string | null> {
  if (!CONTEXT_HINT.test(input.message)) {
    return null;
  }

  const placeName =
    resolveNavigationPlaceName(input.message) ??
    extractLocationFromMessage(input.message);

  const datetime =
    parseRelativeDateTimeFromText(input.message, input.referenceDate) ??
    defaultProbeDatetime(input.referenceDate);

  const extracted: ConfirmationExtractedData = {
    place_name: placeName,
    address: null,
    phone: null,
    datetime,
    url: null,
  };

  const event = persistentEventFromExtracted(extracted, {
    title: input.message.slice(0, 48),
    originHint: input.originHint?.trim() || "현재 위치",
  });

  if (!event) {
    return null;
  }

  return buildDynamicContextPromptBlock({ event });
}

function extractLocationFromMessage(message: string): string | null {
  const match = message.match(
    /([가-힣A-Za-z0-9]+(?:역|점|지점|센터|호텔|공항|역|동|구|시|미팅|회의)?)/
  );
  return match?.[1]?.trim() ?? null;
}

function defaultProbeDatetime(referenceDate: string) {
  const base = new Date(`${referenceDate}T12:00:00`);
  base.setHours(base.getHours() + 2);
  return base.toISOString();
}
