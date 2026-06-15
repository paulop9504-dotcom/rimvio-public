/** Pure guest normalization — testable without localStorage. */
import {
  getAvatarAccent,
  isRimvioAvatarVariant,
  type RimvioAvatarVariantId,
} from "@/lib/brand/rimvio-avatar-colors";

export const PENDING_AVATAR_ACCENT = "#A1A1AA";

export type RoomGuestRecord = {
  id: string;
  label: string;
  avatarVariant: RimvioAvatarVariantId | null;
  avatarDrawn: boolean;
  color: string;
};

export type LegacyRoomGuestRecord = {
  id?: string;
  label?: string;
  color?: string;
  emoji?: string;
  avatarVariant?: string | null;
  avatarDrawn?: boolean;
};

export function buildDrawnGuestRecord(input: {
  id: string;
  label: string;
  avatarVariant: RimvioAvatarVariantId;
}): RoomGuestRecord {
  return {
    id: input.id,
    label: input.label,
    avatarVariant: input.avatarVariant,
    avatarDrawn: true,
    color: getAvatarAccent(input.avatarVariant),
  };
}

export function buildPendingGuestRecord(input: {
  id: string;
  label: string;
}): RoomGuestRecord {
  return {
    id: input.id,
    label: input.label,
    avatarVariant: null,
    avatarDrawn: false,
    color: PENDING_AVATAR_ACCENT,
  };
}

function migrateGuestLabel(label: string): string {
  const trimmed = label.trim();
  if (/글랑고|Glango/i.test(trimmed)) {
    return trimmed.replace(/글랑고/g, "림비오").replace(/Glango/gi, "Rimvio");
  }
  return trimmed;
}

export function normalizeGuestRecord(
  raw: LegacyRoomGuestRecord,
  fallback: RoomGuestRecord
): RoomGuestRecord {
  const id = raw.id?.trim() || fallback.id;
  const label = migrateGuestLabel(raw.label?.trim() || fallback.label);

  if (raw.avatarDrawn === false) {
    return buildPendingGuestRecord({ id, label });
  }

  if (raw.avatarVariant && isRimvioAvatarVariant(raw.avatarVariant)) {
    return buildDrawnGuestRecord({
      id,
      label,
      avatarVariant: raw.avatarVariant,
    });
  }

  if (raw.id?.trim() && raw.label?.trim()) {
    return buildPendingGuestRecord({ id, label });
  }

  return fallback;
}

export function guestNeedsAvatarDraw(guest: RoomGuestRecord) {
  return !guest.avatarDrawn;
}
