/** Rimvio North Star — product soul */
export const NORTH_STAR = {
  slogan: "Your Life, Operable.",
  /** Canonical product definition (KO) — docs/RIMVIO_CONSTITUTION.md */
  experienceOsDefinitionKo:
    "사용자의 경험 데이터를 시간·장소·사람·행동 단위로 구조화하고, 축적된 맥락을 기반으로 다음 행동을 제안·실행하는 Experience OS",
  experienceOsHumanKo:
    "하루 동안 남겨진 사진, 위치, 대화를 기억하고, 다음에 하고 싶을 일을 가장 편하게 이어주는 앱",
  experienceOsDefinitionEn:
    "An Experience OS that structures life across time, place, people, and action — then suggests and runs the next step from accumulated context.",
  experienceOsHumanEn:
    "Remembers today's photos, location, and conversations — and picks up what you want to do next.",
  taglineKo:
    "하루의 사진·위치·대화를 기억하고, 다음 일을 이어주는 Experience OS",
  systemMission:
    "You are Rimvio, an Experience OS. Structure context by time, place, people, and action; suggest and execute the next meaningful step from accumulated context — not open-ended chat.",
  loading: "[생각중...]",
  loadingDock: "Making your life Operable…",
  sessionConnected: (personaLabel: string) =>
    `${personaLabel}와의 세션을 연결했습니다. Your life is now Operable.`,
} as const;

/** Injected at the top of every Rimvio system prompt. */
export function buildNorthStarPromptHeader() {
  return [
    "# North Star (immutable mission)",
    NORTH_STAR.systemMission,
    `- Product soul: "${NORTH_STAR.slogan}" — **Experience OS**; conversation is ingress, not the product.`,
    `- Definition: ${NORTH_STAR.experienceOsDefinitionEn}`,
    "- Context-first: photos, location, chat → experience node → @ action. Operable > conversational.",
    "- OS, not app: coordinate relationships, work, and routine as one continuous life surface.",
    `- Korean anchor: ${NORTH_STAR.taglineKo}`,
  ].join("\n");
}

/** Rimvio product brand — user-facing name & URLs */
export const RIMVIO = {
  name: "Rimvio",
  nameKo: "림비오",
  lockup: "Rimvio · 림비오",
  /** North Star — primary product identity */
  northStar: NORTH_STAR.slogan,
  northStarKo: NORTH_STAR.taglineKo,
  /** Primary user-facing tagline */
  tagline: NORTH_STAR.taglineKo,
  taglineShort: "말하면 실행",
  /** Link share remains an ingress channel, not product identity */
  ingressTagline: "링크·사진 공유로도 시작할 수 있어요",
  domain: "rimvio.app",
  homeLabel: "Rimvio 홈",
} as const;

export function rimvioBeamUrl(slug: string) {
  const base =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : `https://${RIMVIO.domain}`;

  return `${base}/s/${slug}`;
}

/** @deprecated use RIMVIO */
export const GLANGO = RIMVIO;
/** @deprecated use RIMVIO */
export const GLANG = RIMVIO;
/** @deprecated use rimvioBeamUrl */
export const glangoBeamUrl = rimvioBeamUrl;
/** @deprecated use rimvioBeamUrl */
export const glangBeamUrl = rimvioBeamUrl;
