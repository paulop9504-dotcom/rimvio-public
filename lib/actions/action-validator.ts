import { resolveDeepLinkWebFallback } from "@/lib/actions/deep-link-fallbacks";
import {
  isCustomSchemeHref,
  isDirectNavigationHref,
  readActionFallbackHref,
} from "@/lib/actions/open-with-fallback";
import type { LinkActionItem } from "@/types/database";

export type ActionValidationStatus = "ok" | "fallback_added" | "web_only" | "invalid";

export type ValidatedActionMeta = {
  validationStatus: ActionValidationStatus;
  validatedAt?: string;
};

function readCopyText(action: LinkActionItem) {
  const value = action.payload?.copyText;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPlaceholderHref(href: string) {
  return href === "#copy-text" || href === "#similar-links" || href === "#copy-account";
}

function isValidHttpHref(href: string) {
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateLinkAction(action: LinkActionItem): LinkActionItem {
  const href = action.href?.trim() ?? "";
  if (!href || isPlaceholderHref(href)) {
    return {
      ...action,
      payload: {
        ...action.payload,
        validationStatus: "ok" satisfies ActionValidationStatus,
      },
    };
  }

  if (isDirectNavigationHref(href)) {
    return {
      ...action,
      payload: {
        ...action.payload,
        validationStatus: "ok",
      },
    };
  }

  if (isValidHttpHref(href)) {
    return {
      ...action,
      payload: {
        ...action.payload,
        validationStatus: "ok",
      },
    };
  }

  if (!isCustomSchemeHref(href)) {
    return {
      ...action,
      payload: {
        ...action.payload,
        validationStatus: "invalid",
      },
    };
  }

  const existingFallback = readActionFallbackHref(action.payload ?? undefined);
  if (existingFallback && isValidHttpHref(existingFallback)) {
    return {
      ...action,
      payload: {
        ...action.payload,
        validationStatus: "ok",
        fallbackHref: existingFallback,
      },
    };
  }

  const inferredFallback = resolveDeepLinkWebFallback(href, readCopyText(action));
  if (!inferredFallback) {
    return {
      ...action,
      payload: {
        ...action.payload,
        validationStatus: "ok",
      },
    };
  }

  return {
    ...action,
    payload: {
      ...action.payload,
      fallbackHref: inferredFallback,
      validationStatus: existingFallback ? "ok" : "fallback_added",
    },
  };
}

export function validateLinkActions(actions: LinkActionItem[]) {
  return actions.map(validateLinkAction).filter((action) => {
    const status = action.payload?.validationStatus;
    return status !== "invalid" || Boolean(action.href && /^(tel|telprompt):/i.test(action.href));
  });
}

export type RemoteActionValidation = {
  href: string;
  ok: boolean;
  status?: number;
};

export async function validateHttpActionsRemotely(
  hrefs: string[],
  options?: { timeoutMs?: number }
): Promise<RemoteActionValidation[]> {
  const unique = [...new Set(hrefs.filter(isValidHttpHref))];
  if (unique.length === 0) {
    return [];
  }

  try {
    const response = await fetch("/api/actions/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hrefs: unique }),
      cache: "no-store",
      signal: options?.timeoutMs
        ? AbortSignal.timeout(options.timeoutMs)
        : AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return unique.map((href) => ({ href, ok: true }));
    }

    const payload = (await response.json()) as { results?: RemoteActionValidation[] };
    return Array.isArray(payload.results) ? payload.results : [];
  } catch {
    return unique.map((href) => ({ href, ok: true }));
  }
}

export function applyRemoteValidationToActions(
  actions: LinkActionItem[],
  results: RemoteActionValidation[]
) {
  const resultMap = new Map(results.map((entry) => [entry.href, entry]));
  const validatedAt = new Date().toISOString();

  return actions.flatMap((action) => {
    const href = action.href?.trim() ?? "";
    const fallback = readActionFallbackHref(action.payload ?? undefined);
    const remote = resultMap.get(href);

    if (!remote || remote.ok) {
      return [
        {
          ...action,
          payload: {
            ...action.payload,
            validatedAt,
          },
        },
      ];
    }

    if (fallback && isValidHttpHref(fallback)) {
      return [
        {
          ...action,
          href: fallback,
          payload: {
            ...action.payload,
            validationStatus: "web_only" satisfies ActionValidationStatus,
            originalHref: href,
            validatedAt,
          },
        },
      ];
    }

    return [];
  });
}
