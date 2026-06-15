import {
  isRimvioAvatarVariant,
  rollRimvioAvatarVariant,
  type RimvioAvatarVariantId,
} from "@/lib/brand/rimvio-avatar-colors";
import { markAvatarDrawOnboardingComplete } from "@/lib/onboarding/avatar-onboarding";
import {
  buildDrawnGuestRecord,
  buildPendingGuestRecord,
  normalizeGuestRecord,
  type LegacyRoomGuestRecord,
  type RoomGuestRecord,
  PENDING_AVATAR_ACCENT,
} from "@/lib/rooms/guest-normalize";

export type RoomGuest = RoomGuestRecord;
export { PENDING_AVATAR_ACCENT };

const GUEST_KEY = "blink-room-guest";
export const ROOM_GUEST_UPDATED = "rimvio-room-guest-updated";

const GUEST_NAMES = [
  "오늘 바쁜 민지",
  "커피 없으면 안 되는 준호",
  "링크 잘 모으는 하은",
  "퇴근 각 잡는 서연",
  "같이 가자는 태민",
  "기분 좋은 수아",
] as const;

export const SSR_PENDING_GUEST: RoomGuest = buildPendingGuestRecord({
  id: "guest-ssr",
  label: "림비오",
});

function pickGuest(): RoomGuest {
  const index = Math.floor(Math.random() * GUEST_NAMES.length);

  return buildPendingGuestRecord({
    id: `guest-${crypto.randomUUID().slice(0, 8)}`,
    label: GUEST_NAMES[index],
  });
}

function normalizeGuest(raw: LegacyRoomGuestRecord): RoomGuest {
  return normalizeGuestRecord(raw, pickGuest());
}

export function needsAvatarDraw(guest: RoomGuest = getRoomGuest()) {
  return !guest.avatarDrawn;
}

export function saveRoomGuest(guest: RoomGuest) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(GUEST_KEY, JSON.stringify(normalizeGuestRecord(guest, pickGuest())));
  window.dispatchEvent(new CustomEvent(ROOM_GUEST_UPDATED));
}

export function updateRoomGuest(
  patch: Partial<Pick<RoomGuest, "label">>
): RoomGuest {
  const current = getRoomGuest();
  const next =
    current.avatarDrawn && current.avatarVariant
      ? buildDrawnGuestRecord({
          id: current.id,
          label: patch.label?.trim() || current.label,
          avatarVariant: current.avatarVariant,
        })
      : buildPendingGuestRecord({
          id: current.id,
          label: patch.label?.trim() || current.label,
        });
  saveRoomGuest(next);
  return next;
}

/** One-time override (e.g. ?avatar=purple) — keeps label/id, swaps color only. */
export function assignAvatarVariant(variant: RimvioAvatarVariantId): RoomGuest {
  const current = getRoomGuest();
  const next = buildDrawnGuestRecord({
    id: current.id,
    label: current.label,
    avatarVariant: variant,
  });
  saveRoomGuest(next);
  markAvatarDrawOnboardingComplete();
  return next;
}

/** Weighted roll + persist — call after draw animation lands. */
export function completeAvatarDraw(variant: RimvioAvatarVariantId): RoomGuest {
  const current = getRoomGuest();
  if (current.avatarDrawn) {
    return current;
  }

  const next = buildDrawnGuestRecord({
    id: current.id,
    label: current.label,
    avatarVariant: variant,
  });
  saveRoomGuest(next);
  markAvatarDrawOnboardingComplete();
  return next;
}

export function rollAndCompleteAvatarDraw(): RoomGuest {
  return completeAvatarDraw(rollRimvioAvatarVariant());
}

export function resetGuestForAvatarDraw(): RoomGuest {
  if (typeof window !== "undefined") {
    localStorage.removeItem(GUEST_KEY);
  }

  const guest = pickGuest();
  saveRoomGuest(guest);
  return guest;
}

function founderPurpleEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_FOUNDER_PURPLE === "1"
  );
}

function applyFounderPurpleIfEnabled(guest: RoomGuest): RoomGuest {
  if (!founderPurpleEnabled()) {
    return guest;
  }

  if (guest.avatarDrawn && guest.avatarVariant === "purple") {
    return guest;
  }

  const next = buildDrawnGuestRecord({
    id: guest.id,
    label: guest.label,
    avatarVariant: "purple",
  });
  saveRoomGuest(next);
  markAvatarDrawOnboardingComplete();
  return next;
}

export function getRoomGuest(): RoomGuest {
  if (typeof window === "undefined") {
    return SSR_PENDING_GUEST;
  }

  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LegacyRoomGuestRecord;
      const guest = normalizeGuest(parsed);

      const legacyNeedsPersist =
        parsed.avatarDrawn === undefined ||
        (guest.avatarDrawn &&
          (!parsed.avatarVariant || !isRimvioAvatarVariant(parsed.avatarVariant))) ||
        (!guest.avatarDrawn &&
          parsed.avatarVariant &&
          isRimvioAvatarVariant(parsed.avatarVariant));

      if (legacyNeedsPersist) {
        saveRoomGuest(guest);
      }

      return applyFounderPurpleIfEnabled(guest);
    }
  } catch {
    // fall through
  }

  const guest = pickGuest();
  saveRoomGuest(guest);
  return applyFounderPurpleIfEnabled(guest);
}
