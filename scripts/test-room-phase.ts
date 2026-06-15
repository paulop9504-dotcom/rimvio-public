import {
  detectRoomPhaseFromAction,
  linkAlignsWithRoomPhase,
  pickRoomPrimaryAction,
  recordRoomPhasePulse,
  resolveDominantRoomPhase,
} from "../lib/rooms/room-phase";
import type { LinkActionItem } from "../types/database";

function assert(name: string, condition: boolean) {
  if (!condition) {
    throw new Error(`✗ ${name}`);
  }
  console.log(`✓ ${name}`);
}

const mapAction: LinkActionItem = {
  id: "map-1",
  label: "📍 네이버지도 · 강남역",
  kind: "open",
  href: "nmap://search?query=강남역",
  payload: { icon: "map", copyText: "강남역" },
};

const commerceAction: LinkActionItem = {
  id: "shop-1",
  label: "🔔 가격 알림 설정",
  kind: "open",
  href: "https://search.shopping.naver.com/search/all?query=test",
  payload: { icon: "bell" },
};

const travelLink = {
  category: "travel",
} as const;

const shoppingLink = {
  category: "shopping",
} as const;

assert("detects map phase", detectRoomPhaseFromAction(mapAction) === "map");
assert(
  "detects commerce phase",
  detectRoomPhaseFromAction(commerceAction) === "commerce"
);

let phase = recordRoomPhasePulse(null, mapAction);
phase = recordRoomPhasePulse(phase, mapAction);
const dominant = resolveDominantRoomPhase(phase);

assert("dominant phase after 2 map pulses", dominant?.mode === "map");
assert(
  "travel link aligns with map phase",
  linkAlignsWithRoomPhase(travelLink, "map")
);
assert(
  "shopping link does not align with map phase",
  !linkAlignsWithRoomPhase(shoppingLink, "map")
);

const actions: LinkActionItem[] = [
  commerceAction,
  mapAction,
  {
    id: "open-1",
    label: "원본 열기",
    kind: "open",
    href: "https://example.com",
    payload: { icon: "external-link" },
  },
];

const coupled = pickRoomPrimaryAction(actions, phase, travelLink);
assert(
  "room phase pulls map action for travel link",
  coupled?.id === mapAction.id
);

const uncoupled = pickRoomPrimaryAction(actions, phase, shoppingLink);
assert(
  "shopping link ignores map room phase",
  uncoupled?.id !== mapAction.id || uncoupled?.id === commerceAction.id
);

console.log("\n6 room phase checks passed.");
