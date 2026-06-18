import type {
  UserDefinedAction,
  UserDefinedActionMatch,
} from "@/lib/actions/user-defined-action-types";

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function parseKoreanMoneyToNumber(text: string): number | null {
  const trimmed = text.trim();

  const eok = trimmed.match(/(\d+(?:\.\d+)?)\s*억/);
  if (eok) {
    return Math.round(Number.parseFloat(eok[1]!) * 100_000_000);
  }

  const man = trimmed.match(/(\d+(?:\.\d+)?)\s*만(?:\s*원)?/);
  if (man) {
    return Math.round(Number.parseFloat(man[1]!) * 10_000);
  }

  const cheon = trimmed.match(/(\d+(?:\.\d+)?)\s*천(?:\s*원)?/);
  if (cheon) {
    return Math.round(Number.parseFloat(cheon[1]!) * 1_000);
  }

  const won = trimmed.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
  if (won) {
    return Number.parseInt(won[1]!.replace(/,/g, ""), 10);
  }

  return null;
}

export function extractActionParams(
  message: string,
  action: UserDefinedAction
): Record<string, string> {
  const params: Record<string, string> = {};

  for (const spec of action.params) {
    if (spec.key === "amount" || /금액|amount/i.test(spec.label)) {
      const amount = parseKoreanMoneyToNumber(message);
      if (amount != null) {
        params.amount = String(amount);
      }
      continue;
    }

    const inline = message.match(
      new RegExp(`${spec.label}\\s*[:：]?\\s*([^\\s,]+)`, "i")
    );
    if (inline?.[1]) {
      params[spec.key] = inline[1].trim();
    }
  }

  return params;
}

export function resolveUserDefinedActionUrl(
  template: string,
  params: Record<string, string>
) {
  let resolved = template;

  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replaceAll(`{${key}}`, encodeURIComponent(value));
    resolved = resolved.replaceAll(`[${key}]`, encodeURIComponent(value));
  }

  resolved = resolved.replace(/\{[a-zA-Z0-9_]+\}/g, "");
  resolved = resolved.replace(/&&+/g, "&").replace(/\?&/g, "?").replace(/[?&]$/, "");

  return resolved;
}

function scoreTrigger(message: string, trigger: string) {
  const normalizedMessage = normalizeText(message);
  const normalizedTrigger = normalizeText(trigger);
  if (!normalizedTrigger) {
    return 0;
  }

  if (normalizedMessage.includes(normalizedTrigger)) {
    return normalizedTrigger.length + 10;
  }

  const tokens = normalizedTrigger.split(" ").filter(Boolean);
  const hits = tokens.filter((token) => normalizedMessage.includes(token)).length;
  if (hits === 0) {
    return 0;
  }

  return hits * 3;
}

export function matchUserDefinedAction(
  message: string,
  actions: UserDefinedAction[]
): UserDefinedActionMatch | null {
  const trimmed = message.trim();
  if (!trimmed || actions.length === 0) {
    return null;
  }

  let best: UserDefinedActionMatch | null = null;
  let bestScore = 0;

  for (const action of actions) {
    for (const trigger of action.triggers) {
      const score = scoreTrigger(trimmed, trigger);
      if (score <= bestScore) {
        continue;
      }

      const params = extractActionParams(trimmed, action);
      const missingRequired = action.params.some(
        (spec) => spec.required && !params[spec.key]
      );
      if (missingRequired) {
        continue;
      }

      bestScore = score;
      best = {
        action,
        trigger,
        params,
        resolvedUrl: resolveUserDefinedActionUrl(action.urlTemplate, params),
      };
    }

    const nameScore = scoreTrigger(trimmed, action.name);
    if (nameScore > bestScore) {
      const params = extractActionParams(trimmed, action);
      bestScore = nameScore;
      best = {
        action,
        trigger: action.name,
        params,
        resolvedUrl: resolveUserDefinedActionUrl(action.urlTemplate, params),
      };
    }
  }

  return best;
}
