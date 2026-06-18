import { extractPlaceEntities, stripUiNoise } from "@/lib/action-chat/clean-entity-text";
import { decomposeInput, pickPrimaryPlaceTask } from "@/lib/action-chat/decompose-input";
import {
  getAddressFromFragment,
  getPlaceFromFragment,
} from "@/lib/action-chat/fragment-extractors";
import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import type {
  ConfirmationExtractedData,
  OrchestratorConfirmationWire,
} from "@/lib/action-chat/confirmation-types";
import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { buildConfirmMessageBundle } from "@/lib/action-chat/confirm-message-generator";
import { readNavAddress } from "@/lib/action-chat/normalize-address";
import { isVitalityStateUtterance } from "@/lib/vitality-state/classify-vitality-state-intent";
import { isNonLocationActionCommand } from "@/lib/action-chat/is-non-location-action";
import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { looksLikePlaceSearchCommand } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { isEntityFacetMessage } from "@/lib/context-resolver/discovery/parse-entity-facet-intent";
import {
  isPlaceRecommendationQuery,
  parseFindPlaceIntent,
} from "@/lib/context-resolver/discovery/parse-find-place-intent";
import type {
  OrchestrateHistoryTurn,
  OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";

const PLACE_NAME_ONLY =
  /(?:갤러리아|스타벅스|맥도날드|쿠우쿠우|이마트|홈플러스|코스트코|올리브영|cgv|메가박스)/i;

const EXPLICIT_ADDRESS =
  /(?:특별시|광역시|시|군|구)\s+[가-힣0-9\s\-]+(?:로|길|번길|동로)\s*\d+/;

const STATION_OR_TRANSIT =
  /(?:[가-힣A-Za-z0-9]{2,12}역|[가-힣A-Za-z0-9]{2,12}공항|터미널)/;

function emptyExtracted(): ConfirmationExtractedData {
  return {
    address: null,
    phone: null,
    datetime: null,
    place_name: null,
    url: null,
  };
}

export function buildExtractedDataFromText(
  message: string,
  referenceDate: string
): ConfirmationExtractedData {
  const cleaned = stripUiNoise(message);
  const decomposed = decomposeInput(message, { referenceDate });
  const primary = pickPrimaryPlaceTask(decomposed);
  const fragment = primary?.raw_snippet ?? cleaned;

  const place_name =
    primary?.place ??
    getPlaceFromFragment(fragment) ??
    resolveNavigationPlaceName(fragment);

  const address =
    getAddressFromFragment(fragment) ??
    readNavAddress(extractPlaceEntities(fragment).address) ??
    extractPlaceEntities(fragment).address?.display ??
    null;
  const datetime =
    primary?.datetime ??
    parseRelativeDateTimeFromText(fragment, referenceDate);
  const info = extractPlaceEntities(fragment);

  return {
    address,
    phone: info.phone ?? null,
    datetime,
    place_name,
    url: info.website ?? null,
  };
}

export function assessPlaceConfirmationNeed(input: {
  message: string;
  referenceDate?: string;
  history?: readonly OrchestrateHistoryTurn[];
}): {
  needsConfirm: boolean;
  confidence: number;
  persona_message: string;
  data_prompt: string;
  confirm_message: string;
  extracted_data: ConfirmationExtractedData;
} | null {
  const message = stripUiNoise(input.message.trim());
  if (!message || message.length > 120) {
    return null;
  }

  if (isVitalityStateUtterance(message)) {
    return null;
  }

  if (isNonLocationActionCommand(message)) {
    return null;
  }

  if (isEntityFacetMessage(message)) {
    return null;
  }

  const discoveryQuery = enrichPlaceDiscoveryMessage(message, input.history);

  if (isPlaceRecommendationQuery(message) || isPlaceRecommendationQuery(discoveryQuery)) {
    return null;
  }

  if (parseFindPlaceIntent(discoveryQuery)) {
    return null;
  }

  if (looksLikePlaceSearchCommand(message)) {
    return null;
  }

  if (EXPLICIT_ADDRESS.test(message)) {
    return null;
  }

  const extracted = buildExtractedDataFromText(
    message,
    input.referenceDate ?? new Date().toISOString().slice(0, 10)
  );

  const stationMatch = message.match(/([가-힣A-Za-z0-9]{2,12}역)/);
  const stationLabel = stationMatch?.[1] ?? null;

  const hasPlaceSignal =
    Boolean(extracted.place_name) ||
    Boolean(stationLabel) ||
    PLACE_NAME_ONLY.test(message) ||
    STATION_OR_TRANSIT.test(message) ||
    /(?:둔산|강남|역삼|타임월드|센터시티|도안|월드컵)/.test(message);

  if (!hasPlaceSignal) {
    return null;
  }

  const placeLabel =
    stationLabel ??
    resolveNavigationPlaceName(message) ??
    (extracted.place_name && extracted.place_name.length <= 16
      ? extracted.place_name
      : null) ??
    message.match(PLACE_NAME_ONLY)?.[0] ??
    message.match(STATION_OR_TRANSIT)?.[0] ??
    null;

  if (!placeLabel) {
    return null;
  }

  const inferredAddress =
    extracted.address ??
    (/(?:둔산|강남|역삼|타임월드|센터시티|도안|월드컵)/.test(message)
      ? inferAddressFromBranch(message)
      : null);

  const extractedWithGuess: ConfirmationExtractedData = {
    ...extracted,
    place_name: placeLabel,
    address: inferredAddress,
  };

  const hasFullAddress = Boolean(extracted.address && EXPLICIT_ADDRESS.test(extracted.address));
  const confidence = hasFullAddress ? 0.95 : extracted.address ? 0.82 : 0.68;

  if (confidence >= 0.92 && hasFullAddress) {
    return null;
  }

  const locationHint = inferredAddress
    ? inferredAddress.replace(/\s+\d+.*/, "").slice(0, 20)
    : /(?:둔산|강남|역삼|타임월드|센터시티|도안|월드컵)/.test(message)
      ? message.match(/(?:둔산|강남|역삼|타임월드|센터시티|도안|월드컵)/)?.[0] ?? ""
      : "";

  const displayLocation =
    [locationHint, placeLabel].filter(Boolean).join(" ").trim() || placeLabel;

  const messages = buildConfirmMessageBundle({
    locationLabel: displayLocation,
    category: "PLACE",
    referenceDate: input.referenceDate,
  });

  return {
    needsConfirm: true,
    confidence,
    persona_message: messages.persona_message,
    data_prompt: messages.data_prompt,
    confirm_message: messages.data_prompt,
    extracted_data: extractedWithGuess,
  };
}

function inferAddressFromBranch(message: string) {
  if (/둔산|타임월드|센터시티/i.test(message)) {
    return "대전 서구 둔산동 1016";
  }
  if (/강남|역삼/i.test(message)) {
    return "서울 강남구 역삼동";
  }
  return null;
}

export function buildConfirmationOrchestratorResult(input: {
  persona_message: string;
  data_prompt?: string;
  confirm_message?: string;
  extracted_data: ConfirmationExtractedData;
  confidence?: number;
  thought?: string;
  confirm_data?: OrchestratorConfirmationWire["confirm_data"];
  batch_pending?: OrchestratorConfirmationWire["batch_pending"];
  location_suggestions?: OrchestratorConfirmationWire["location_suggestions"];
  location_ux?: OrchestratorConfirmationWire["location_ux"];
  area_disambiguation?: OrchestratorConfirmationWire["area_disambiguation"];
}): OrchestratorResult {
  const dataPrompt = input.data_prompt ?? input.confirm_message ?? "아래 정보로 진행할까요?";
  const confirmation: OrchestratorConfirmationWire = {
    meta: { intent: "CONFIRM" },
    persona_message: input.persona_message,
    confirm_message: dataPrompt,
    extracted_data: input.extracted_data,
    thought: input.thought,
    confirm_data: input.confirm_data,
    batch_pending: input.batch_pending,
    location_suggestions: input.location_suggestions,
    location_ux: input.location_ux,
    area_disambiguation: input.area_disambiguation,
  };

  return {
    summary: input.persona_message.slice(0, 80),
    actions: [],
    source: "rules",
    confidence: input.confidence ?? 0.78,
    disclosure: "high",
    actionsRevealed: false,
    pendingConfirm: true,
    thought: input.thought,
    confirmation,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
  };
}

export function tryPlaceConfirmation(input: {
  message: string;
  referenceDate?: string;
  history?: readonly OrchestrateHistoryTurn[];
}): OrchestratorResult | null {
  const assessment = assessPlaceConfirmationNeed(input);
  if (!assessment?.needsConfirm) {
    return null;
  }

  return buildConfirmationOrchestratorResult({
    persona_message: assessment.persona_message,
    data_prompt: assessment.data_prompt,
    extracted_data: assessment.extracted_data,
    confidence: assessment.confidence,
  });
}

export function markConfirmationExecuted(
  result: OrchestratorResult
): OrchestratorResult {
  if (!result.confirmation) {
    return result;
  }

  return {
    ...result,
    confirmation: {
      ...result.confirmation,
      meta: { intent: "EXECUTE" },
    },
    pendingConfirm: false,
  };
}
