import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import {
  feedSlotPeerChipGradientCss,
  feedSlotPeerChipShortLabel,
} from "@/lib/feed/feed-slot-peer-chip-colors";
import { dispatchGlobeContextShareRequest } from "@/lib/globe/globe-context-share-request";

const LONG_PRESS_MS = 520;
/** Finger jitter on mobile — above this, treat as globe drag not tap. */
const TAP_MOVE_PX = 20;

export type Globe3dPinInteractionHandlers = {
  onPress: (pinId: string) => void;
  onRelocateStart?: (pinId: string) => void;
  /** OrbitControls steal touches unless locked for the full press cycle. */
  lockControls?: () => void;
  unlockControls?: () => void;
};

function bindShareCornerPress(target: HTMLElement, onActivate: () => void): void {
  target.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    event.preventDefault();
  });
  target.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    onActivate();
  });
}

function appendShareCorner(card: HTMLElement, pin: ClassifiedGlobePin): void {
  const eventId = pin.sourceEventId?.trim();
  if (!eventId || pin.pinShape === "cluster" || pin.pinShape === "viewer") {
    return;
  }

  const shared = pin.sharedWith ?? [];
  const corner = document.createElement("span");
  corner.className = "rimvio-globe-3d-pin__share-corner";
  corner.setAttribute("role", "button");
  corner.tabIndex = 0;

  if (shared.length > 0) {
    corner.classList.add("rimvio-globe-3d-pin__share-corner--shared");
    corner.setAttribute(
      "aria-label",
      `${shared.map((row) => row.displayName).join(", ")} · 공유 추가`,
    );

    const avatars = document.createElement("span");
    avatars.className = "rimvio-globe-3d-pin__share-avatars";
    avatars.setAttribute("aria-hidden", "true");

    for (const peer of shared.slice(0, 2)) {
      const avatar = document.createElement("span");
      avatar.className = "rimvio-globe-3d-pin__share-avatar";

      if (peer.avatarUrl) {
        const image = document.createElement("img");
        image.src = peer.avatarUrl;
        image.alt = "";
        image.className = "rimvio-globe-3d-pin__share-avatar-img";
        avatar.appendChild(image);
      } else {
        avatar.style.background = feedSlotPeerChipGradientCss(peer.peerThreadId);
        avatar.textContent = feedSlotPeerChipShortLabel(peer.displayName);
      }

      avatars.appendChild(avatar);
    }

    corner.appendChild(avatars);

    if (shared.length > 2) {
      const more = document.createElement("span");
      more.className = "rimvio-globe-3d-pin__share-more";
      more.textContent = `+${shared.length - 2}`;
      corner.appendChild(more);
    }
  } else {
    corner.classList.add("rimvio-globe-3d-pin__share-corner--empty");
    corner.setAttribute("aria-label", "공유하기");
    corner.textContent = "공유";
  }

  bindShareCornerPress(corner, () => {
    dispatchGlobeContextShareRequest({ eventId, pinId: pin.id });
  });

  card.appendChild(corner);
}

function appendPeerRow(card: HTMLElement, pin: ClassifiedGlobePin): void {
  const peers = pin.peers ?? [];
  if (peers.length === 0) {
    return;
  }

  const row = document.createElement("span");
  row.className = "rimvio-globe-3d-pin__peers";

  const avatars = document.createElement("span");
  avatars.className = "rimvio-globe-3d-pin__peer-avatars";
  avatars.setAttribute("aria-hidden", "true");

  for (const peer of peers.slice(0, 3)) {
    const avatar = document.createElement("span");
    avatar.className = "rimvio-globe-3d-pin__peer-avatar";
    avatar.title = peer.displayName;

    if (peer.avatarUrl) {
      const image = document.createElement("img");
      image.src = peer.avatarUrl;
      image.alt = "";
      image.className = "rimvio-globe-3d-pin__peer-avatar-img";
      avatar.appendChild(image);
    } else {
      avatar.style.background = feedSlotPeerChipGradientCss(peer.peerThreadId);
      avatar.textContent = feedSlotPeerChipShortLabel(peer.displayName);
    }

    avatars.appendChild(avatar);
  }

  row.appendChild(avatars);

  const names = document.createElement("span");
  names.className = "rimvio-globe-3d-pin__peer-names";
  names.textContent = peers.map((peer) => peer.displayName).join(" · ");
  row.appendChild(names);

  card.appendChild(row);
}

function canRelocatePin(
  pin: ClassifiedGlobePin,
  relocateEnabled: boolean,
): boolean {
  return (
    relocateEnabled &&
    pin.pinShape !== "viewer" &&
    pin.pinShape !== "cluster" &&
    Boolean(pin.sourceEventId?.trim())
  );
}

type PinPressSession = {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  longPress: boolean;
  suppressTap: boolean;
  timer: number | null;
};

/** Window-level pointer tracking — pin element often misses pointerup on mobile. */
function bindGlobe3dPinPress(
  root: HTMLElement,
  pinId: string,
  handlers: Globe3dPinInteractionHandlers,
  options?: { relocateEnabled?: boolean },
): void {
  let session: PinPressSession | null = null;

  const clearSession = () => {
    if (!session) {
      return;
    }
    if (session.timer !== null) {
      window.clearTimeout(session.timer);
    }
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    window.removeEventListener("pointercancel", onWindowUp);
    session = null;
  };

  const finish = (event: PointerEvent) => {
    if (!session || event.pointerId !== session.pointerId) {
      return;
    }
    const { moved, longPress, suppressTap } = session;
    clearSession();

    if (longPress) {
      root.classList.remove("rimvio-globe-3d-pin--relocating");
      root.removeAttribute("data-globe-pin-relocating");
      return;
    }

    handlers.unlockControls?.();

    if (!suppressTap && !moved) {
      event.stopPropagation();
      event.preventDefault();
      handlers.onPress(pinId);
    }
  };

  const onWindowMove = (event: PointerEvent) => {
    if (!session || event.pointerId !== session.pointerId) {
      return;
    }
    if (session.longPress) {
      event.preventDefault();
      return;
    }
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (Math.hypot(dx, dy) > TAP_MOVE_PX) {
      session.moved = true;
      if (session.timer !== null) {
        window.clearTimeout(session.timer);
        session.timer = null;
      }
    }
  };

  const onWindowUp = (event: PointerEvent) => {
    finish(event);
  };

  root.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || session) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();

      handlers.lockControls?.();

      session = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        longPress: false,
        suppressTap: false,
        timer: null,
      };

      const relocateEnabled =
        options?.relocateEnabled !== false && Boolean(handlers.onRelocateStart);

      if (relocateEnabled) {
        session.timer = window.setTimeout(() => {
          if (!session) {
            return;
          }
          session.longPress = true;
          session.suppressTap = true;
          root.classList.add("rimvio-globe-3d-pin--relocating");
          root.setAttribute("data-globe-pin-relocating", "true");
          handlers.onRelocateStart?.(pinId);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(12);
          }
        }, LONG_PRESS_MS);
      }

      window.addEventListener("pointermove", onWindowMove, { passive: false });
      window.addEventListener("pointerup", onWindowUp, { passive: false });
      window.addEventListener("pointercancel", onWindowUp, { passive: false });
    },
    { passive: false },
  );
}

export function createGlobe3dClusterPinElement(
  pin: ClassifiedGlobePin,
  handlers: Globe3dPinInteractionHandlers,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.dataset.globePinId = pin.id;
  root.className = "rimvio-globe-3d-pin rimvio-globe-3d-pin--cluster";
  root.setAttribute("aria-label", pin.label);

  const card = document.createElement("span");
  card.className = "rimvio-globe-3d-pin__card rimvio-globe-3d-pin__card--cluster";

  const count = document.createElement("span");
  count.className = "rimvio-globe-3d-pin__cluster-count";
  count.textContent = pin.slot?.experienceTitle?.trim() || pin.label;
  card.appendChild(count);

  const meta = document.createElement("span");
  meta.className = "rimvio-globe-3d-pin__meta";
  meta.textContent = "맥락";
  card.appendChild(meta);

  root.appendChild(card);

  const dot = document.createElement("span");
  dot.className = "rimvio-globe-3d-pin__dot";
  dot.setAttribute("aria-hidden", "true");
  root.appendChild(dot);

  bindGlobe3dPinPress(root, pin.id, handlers, { relocateEnabled: false });

  return root;
}

export function createGlobe3dPinElement(
  pin: ClassifiedGlobePin,
  active: boolean,
  handlers: Globe3dPinInteractionHandlers,
  options?: { relocateEnabled?: boolean },
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.dataset.globePinId = pin.id;
  root.className = `rimvio-globe-3d-pin${pin.tripLeg === "departure" ? " rimvio-globe-3d-pin--departure" : ""}${active ? " rimvio-globe-3d-pin--active" : ""}`;
  const peerLabel = pin.peers?.map((peer) => peer.displayName).join(", ");
  root.setAttribute(
    "aria-label",
    [
      pin.slot?.experienceTitle?.trim() || pin.label.trim() || "경험 핀",
      peerLabel ? `함께한 사람 ${peerLabel}` : null,
      canRelocatePin(pin, options?.relocateEnabled !== false)
        ? "길게 눌러 위치 이동"
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  );

  const card = document.createElement("span");
  card.className = "rimvio-globe-3d-pin__card";

  appendShareCorner(card, pin);

  const title = document.createElement("span");
  title.className = "rimvio-globe-3d-pin__title";
  title.textContent = pin.slot?.experienceTitle?.trim() || pin.label.trim() || "경험";
  card.appendChild(title);

  appendPeerRow(card, pin);

  const meta = document.createElement("span");
  meta.className = "rimvio-globe-3d-pin__meta";
  meta.textContent =
    pin.tripLeg === "departure"
      ? "출발"
      : pin.tripLeg === "destination"
        ? "도착"
        : "경험";
  card.appendChild(meta);

  root.appendChild(card);

  const dot = document.createElement("span");
  dot.className = "rimvio-globe-3d-pin__dot";
  dot.setAttribute("aria-hidden", "true");
  root.appendChild(dot);

  const relocateEnabled = canRelocatePin(pin, options?.relocateEnabled !== false);

  bindGlobe3dPinPress(root, pin.id, handlers, {
    relocateEnabled,
  });

  return root;
}
