import {
  CATEGORY_INTENT_RULES,
  shouldDeferToPlaceDiscovery,
} from "@/lib/korean-service-router/category-intents";
import {
  getServiceById,
  getServicesByCategory,
  KOREAN_SERVICE_CATALOG,
} from "@/lib/korean-service-router/service-catalog";
import type {
  ActionType,
  KoreanServiceEntry,
  KoreanServiceRoutingResult,
  UrgencyLevel,
} from "@/lib/korean-service-router/types";

const ACTION_PRIORITY: Record<ActionType, number> = {
  ORDER: 4,
  BOOK: 3,
  COMPARE: 2,
  SEARCH: 1,
  LEARN: 0,
};

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function detectUrgency(message: string): UrgencyLevel {
  if (/(?:지금|당장|급|빨리|배고|피곤|아파|응급|바로)/u.test(message)) {
    return "HIGH";
  }
  if (/(?:오늘|내일|이번\s*주|좀)/u.test(message)) {
    return "MID";
  }
  return "LOW";
}

function extractQueryTail(message: string, matched: string[]): string {
  let tail = message;
  for (const token of matched) {
    tail = tail.replace(new RegExp(token, "giu"), " ");
  }
  return tail.replace(/(?:열어|켜|가|해|줘|주세요|좀|빨리|지금|당장)/gu, " ").replace(/\s+/g, " ").trim();
}

function appendQuery(actionUrl: string, query: string): string {
  if (!query) {
    return actionUrl;
  }
  const encoded = encodeURIComponent(query);
  if (actionUrl.endsWith("=") || actionUrl.endsWith("/") || actionUrl.includes("?")) {
    if (actionUrl.endsWith("=")) {
      return `${actionUrl}${encoded}`;
    }
    if (actionUrl.endsWith("/")) {
      return `${actionUrl}${encoded}`;
    }
    return `${actionUrl}&q=${encoded}`;
  }
  return `${actionUrl}${encoded}`;
}

type ScoredMatch = {
  entry: KoreanServiceEntry;
  score: number;
  matchedTokens: string[];
  source: "service" | "category";
  intentLabel: string;
  urgency: UrgencyLevel;
};

function scoreService(message: string, entry: KoreanServiceEntry): ScoredMatch | null {
  const normalized = normalize(message);
  const matchedTokens: string[] = [];
  let score = 0;

  for (const keyword of entry.keywords) {
    const kw = normalize(keyword);
    if (normalized.includes(kw)) {
      matchedTokens.push(keyword);
      score += kw.length >= 4 ? 3 : 2;
    }
  }

  if (normalize(entry.name) && normalized.includes(normalize(entry.name))) {
    matchedTokens.push(entry.name);
    score += 4;
  }

  if (score === 0) {
    return null;
  }

  score += ACTION_PRIORITY[entry.actionType] * 0.5;

  return {
    entry,
    score,
    matchedTokens,
    source: "service",
    intentLabel: `${entry.category}_${entry.actionType.toLowerCase()}`,
    urgency: detectUrgency(message),
  };
}

function scoreCategory(message: string): ScoredMatch | null {
  for (const rule of CATEGORY_INTENT_RULES) {
    if (!rule.patterns.test(message)) {
      continue;
    }
    const entry = getServiceById(rule.defaultServiceId);
    if (!entry) {
      continue;
    }
    return {
      entry,
      score: 2 + ACTION_PRIORITY[rule.actionType],
      matchedTokens: [],
      source: "category",
      intentLabel: rule.intentLabel,
      urgency: rule.urgency,
    };
  }
  return null;
}

function pickFallback(entry: KoreanServiceEntry, excludeId: string): string {
  const peers = getServicesByCategory(entry.category).filter((s) => s.id !== excludeId);
  if (peers.length === 0) {
    return entry.homeUrl;
  }
  const sorted = [...peers].sort(
    (a, b) => ACTION_PRIORITY[b.actionType] - ACTION_PRIORITY[a.actionType],
  );
  return sorted[0]?.actionUrl ?? entry.homeUrl;
}

function buildResult(match: ScoredMatch, message: string): KoreanServiceRoutingResult {
  const { entry, matchedTokens, intentLabel, urgency } = match;
  const query = extractQueryTail(message, matchedTokens);
  const deeplink =
    entry.actionType === "SEARCH" || entry.actionType === "COMPARE" || entry.actionType === "LEARN"
      ? appendQuery(entry.actionUrl, query)
      : entry.actionUrl;

  const confidence = Math.min(0.98, 0.55 + match.score * 0.08);

  return {
    intent: intentLabel,
    context: urgency === "HIGH" ? "immediate_need" : "routine",
    action_type: entry.actionType,
    reason: match.source === "category" ? "category_default_convergence" : "service_keyword_match",
    deeplink,
    confidence,
    fallback: pickFallback(entry, entry.id),
    serviceId: entry.id,
    serviceName: entry.name,
    urgency,
  };
}

/** Rule-based Korean web service router — returns null when no confident match. */
export function resolveKoreanServiceDeeplink(message: string): KoreanServiceRoutingResult | null {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length < 2) {
    return null;
  }

  if (shouldDeferToPlaceDiscovery(trimmed)) {
    return null;
  }

  const serviceMatches: ScoredMatch[] = [];
  for (const entry of KOREAN_SERVICE_CATALOG) {
    const scored = scoreService(trimmed, entry);
    if (scored) {
      serviceMatches.push(scored);
    }
  }

  serviceMatches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return ACTION_PRIORITY[b.entry.actionType] - ACTION_PRIORITY[a.entry.actionType];
  });

  const categoryMatch = scoreCategory(trimmed);

  let best: ScoredMatch | null = serviceMatches[0] ?? null;
  if (categoryMatch) {
    if (!best || categoryMatch.score > best.score) {
      best = categoryMatch;
    } else if (categoryMatch.score === best.score) {
      best =
        ACTION_PRIORITY[categoryMatch.entry.actionType] >= ACTION_PRIORITY[best.entry.actionType]
          ? categoryMatch
          : best;
    }
  }

  if (!best || best.score < 2) {
    return null;
  }

  return buildResult(best, trimmed);
}

/** JSON-only output per routing spec (for tests / API). */
export function resolveKoreanServiceDeeplinkJson(message: string): string | null {
  const result = resolveKoreanServiceDeeplink(message);
  if (!result) {
    return null;
  }
  const { serviceId: _id, serviceName: _name, urgency: _u, ...payload } = result;
  return JSON.stringify(payload);
}
