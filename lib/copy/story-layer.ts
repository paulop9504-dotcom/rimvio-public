/**
 * Rimvio vocabulary stack — L0 Brand → L3 Engineering.
 * @see docs/RIMVIO_STORY_LAYER.md
 */

/** L0 — keynote · App Store · pitch. No tech words. */
export const STORY_L0 = {
  personal: {
    en: "You were here. And it mattered.",
    ko: "당신은 이곳에 있었고, 그것은 의미가 있었습니다.",
  },
  external: {
    en: "Every place has a story. Now, it can remember yours.",
    ko: "모든 장소에는 이야기가 있습니다. 이제 그 장소는 당신의 이야기도 기억합니다.",
  },
  category: {
    en: "The world isn't made of places. It's made of moments.",
    ko: "세상은 장소로 이루어진 것이 아닙니다. 순간들로 이루어져 있습니다.",
  },
  launchFilm: {
    en: "Leave something behind.",
    ko: "흔적을 남기세요.",
  },
  lifeMapped: {
    en: "Your life. Mapped by moments.",
    ko: "당신의 삶, 순간들로 그려지다.",
  },
} as const;

/** L1 — user-facing verbs (KO). Map to L3 via STORY_L1_TO_L3. */
export const STORY_L1_VERBS = {
  leaveTrace: "흔적 남기기",
  leaveHere: "여기 남기기",
  discover: "발견",
  remember: "기억",
  recallThere: "그때 거기",
  continue: "이어가기",
  attach: "담기",
  create: "만들기",
} as const;

/** L1 — user-facing nouns (KO). */
export const STORY_L1_NOUNS = {
  trace: "흔적",
  context: "맥락",
  moment: "순간",
  experience: "경험",
  place: "장소",
} as const;

/** L2 — PRD · Cursor task nouns (EN). */
export const STORY_L2 = {
  trace: "Trace",
  context: "Context",
  hub: "Hub",
  resource: "Resource",
  mainSlot: "MAIN slot",
  recall: "Recall",
  lineage: "Lineage",
  pioneer: "Pioneer",
  meaning: "Meaning",
  visibility: "Visibility",
} as const;

/** L3 — engineering anchors (code search terms). */
export const STORY_L3 = {
  pinEntity: "PinEntity",
  eventCandidate: "EventCandidate",
  contextHub: "ContextHubDefinition",
  contextResource: "ContextResource",
  rankContextResources: "rankContextResources",
  globeHubCarousel: "GlobeHubResourceCarousel",
  globeProjection: "Globe projection",
  ingestBar: "GlobeContextIngestBar",
  stackPicker: "GlobeContextStackPicker",
  visibilityPrivate: "globeContextVisibility: private",
  actionRegistry: "mention-feature-registry",
} as const;

/** L1 user phrase → L3 implementation hint (for prompts & PRDs). */
export const STORY_L1_TO_L3 = {
  [STORY_L1_VERBS.leaveTrace]: [
    STORY_L3.ingestBar,
    STORY_L3.eventCandidate,
    STORY_L3.visibilityPrivate,
  ],
  [STORY_L1_VERBS.discover]: [
    "resolveGlobeContextsNearTap",
    STORY_L3.stackPicker,
  ],
  [STORY_L1_VERBS.recallThere]: [
    "useGlobeTripArrival",
    "project-relationship-meaning-line",
  ],
  [STORY_L1_VERBS.attach]: ["ingestGlobeContextFromFiles", "ingestGlobeContextFromText"],
} as const;

/** Never in user-facing UI (L1). Settings power-user exceptions noted in doc. */
export const STORY_FORBIDDEN_USER_FACING = [
  "업로드",
  "게시",
  "포스팅",
  "Geo Social",
  "Experience Graph",
  "Spatial Discovery Graph",
  "AI Experience Layer",
  "Marketplace",
  "좋아요",
  "별점",
  "리뷰 작성",
] as const;

/** Discouraged in hero · CTA · empty state — prefer L1 alternatives. */
export const STORY_DISCOURAGED_HERO = [
  "핀 박기",
  "GPS",
  "AI ",
  "LLM",
  "그래프",
] as const;

/** Cursor / agent header — story + engineering bridge. */
export function buildStoryLayerPromptHeader(surface: "globe" | "feed" | "peers" = "globe") {
  const l0 =
    surface === "globe"
      ? `${STORY_L0.personal.en} / ${STORY_L0.personal.ko}`
      : "Your Life, Operable. — conversation is ingress, not the product.";

  return [
    "# Story Layer (user-facing language)",
    `- L0: ${l0}`,
    `- L1 verbs: ${Object.values(STORY_L1_VERBS).join(" · ")}`,
    `- Never say in UI: ${STORY_FORBIDDEN_USER_FACING.slice(0, 6).join(", ")}…`,
    `- Implement as L3 (Globe): PinEntity projection + EventCandidate truth; no Post model, no like counts.`,
    `- Hub · Resource (locked): docs/GLOBE_HUB_RESOURCE.md — Hub factory/transactions; Resource rank → MAIN slot.`,
    `- Architecture: docs/RFC_UNIVERSAL_PIN_SYSTEM.md`,
    `- Full spec: docs/RIMVIO_STORY_LAYER.md`,
  ].join("\n");
}
