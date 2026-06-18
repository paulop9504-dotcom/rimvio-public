import {
  isRimvioAvatarVariant,
  type RimvioAvatarVariantId,
} from "@/lib/brand/rimvio-avatar-colors";

export function isE2eMode() {
  return process.env.NEXT_PUBLIC_E2E === "1";
}

/** Deterministic draw color — dev server or explicit E2E builds only. */
export function resolveE2eAvatarVariant(
  param: string | null
): RimvioAvatarVariantId | null {
  if (!param || !isRimvioAvatarVariant(param)) {
    return null;
  }

  if (process.env.NODE_ENV === "development" || isE2eMode()) {
    return param;
  }

  return null;
}
