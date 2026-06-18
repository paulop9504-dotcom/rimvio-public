/**
 * Apple-style mobile web UI screenshot prompts — shared structure for image/UI generation.
 * See docs/APPLE_MOBILE_WEB_UI_PROMPT.md for the full Korean guide.
 */

export type AppleMobileWebCardGraphic =
  | "product_stack"
  | "app_icons"
  | "lifestyle_use"
  | "custom";

export type AppleMobileWebCardInput = {
  /** Small grey label above the title (e.g. 창의성, 연결성). */
  category: string;
  /** Bold Korean headline. */
  title: string;
  /** Optional word in title that receives blue-to-green gradient. */
  titleGradientWord?: string;
  /** Supporting paragraph inside the card. */
  body: string;
  /** Visual scene inside the card. */
  graphic: string;
  graphicKind?: AppleMobileWebCardGraphic;
  /** Reference sheet ids for style lock (e.g. image_0.png … image_4.png). */
  referenceImages?: readonly string[];
  /** URL shown in bottom navigation bar. */
  urlBar?: string;
  /** Fixed header tagline under status bar. */
  headerTagline?: string;
};

export const APPLE_MOBILE_WEB_UI_FIXED = {
  style:
    "Modern, clean, minimalist mobile web UI screenshot. White background, large content card with rounded corners, bold crisp Korean sans-serif typography.",
  layout:
    "Fixed top header, single large carousel-style content card (rounded corners), fixed bottom navigation bar.",
  statusBar:
    "Standard iOS status bar at top (time 15:19, cellular signal, Wi-Fi, battery 85%).",
  defaultHeaderTagline:
    "Apple 경험. Apple 제품 및 서비스로 더욱더 많은 걸 누리다.",
  avatar:
    "Rounded male profile photo smiling, bottom-right corner inside the card — same avatar as reference image_0.png.",
  navBar:
    "Bottom navigation: left circular back < button; center URL bar with site icon; right circular … menu button.",
  defaultUrlBar: "apple.com",
  defaultReferences: ["image_0.png", "image_1.png", "image_2.png", "image_3.png", "image_4.png"],
} as const;

export const RIMVIO_MOBILE_WEB_UI_FIXED = {
  ...APPLE_MOBILE_WEB_UI_FIXED,
  defaultHeaderTagline:
    "Rimvio 경험. 하루의 사진·위치·대화를 기억하고, 다음 일을 이어주는 Experience OS.",
  defaultUrlBar: "rimvio.app",
} as const;

const GRAPHIC_HINTS: Record<Exclude<AppleMobileWebCardGraphic, "custom">, string> = {
  product_stack: "Elegant product stack with soft studio lighting on white.",
  app_icons: "Floating app icons with subtle depth and reflection.",
  lifestyle_use:
    "Real hands using the product in a bright, minimal environment with soft particles.",
};

function referenceClause(images: readonly string[] | undefined): string {
  const refs = images?.length ? images : APPLE_MOBILE_WEB_UI_FIXED.defaultReferences;
  return `Mimicking the UI of ${refs.join(", ")}.`;
}

function gradientClause(word: string | undefined): string {
  if (!word?.trim()) {
    return "";
  }
  return ` The word '${word.trim()}' in the title uses a subtle blue-to-green gradient.`;
}

/**
 * Full image-generation prompt for one carousel card + fixed chrome.
 */
export function buildAppleMobileWebCardPrompt(
  input: AppleMobileWebCardInput,
  options?: { brand?: "apple" | "rimvio" }
): string {
  const brand = options?.brand ?? "apple";
  const fixed = brand === "rimvio" ? RIMVIO_MOBILE_WEB_UI_FIXED : APPLE_MOBILE_WEB_UI_FIXED;
  const urlBar = input.urlBar ?? fixed.defaultUrlBar;
  const header = input.headerTagline ?? fixed.defaultHeaderTagline;
  const graphicKind = input.graphicKind ?? "custom";
  const graphicHint =
    graphicKind === "custom" ? input.graphic : `${GRAPHIC_HINTS[graphicKind]} ${input.graphic}`;

  return [
    referenceClause(input.referenceImages),
    fixed.style,
    fixed.layout,
    fixed.statusBar,
    `Fixed header with Korean tagline: "${header}".`,
    "Below the header, a single large rounded-corner card on a white background.",
    `Inside the card, top: smaller grey category text "${input.category}".`,
    `Below: large bold Korean title "${input.title}".${gradientClause(input.titleGradientWord)}`,
    `Below the title: smaller fine Korean body text: "${input.body}".`,
    `Graphic: ${graphicHint.trim()}`,
    fixed.avatar,
    `Below the card: full standard navigation bar showing '${urlBar}'.`,
    fixed.navBar,
    "Soft lighting, premium product photography, no clutter, no watermark.",
  ].join(" ");
}

/** Preset cards — swap category / title / body / graphic only. */
export const APPLE_MOBILE_WEB_CARD_PRESETS = {
  creativity: {
    category: "창의성",
    title: "당신의 상상력을 현실로.",
    titleGradientWord: "상상력",
    body: "최고의 도구로 아이디어를 스케치하고 완성하세요.",
    graphic:
      "Close-up of a hand using Apple Pencil to draw a stylized tree of lightbulbs on an iPad screen, soft light particles floating around.",
    graphicKind: "lifestyle_use" as const,
  },
  connectivity: {
    category: "연결성",
    title: "세상과 더 가깝게.",
    titleGradientWord: "가깝게",
    body: "메시지·영상·공유가 한 흐름으로 이어집니다.",
    graphic:
      "iPhone showing a warm video call grid with soft bokeh and floating message bubbles.",
    graphicKind: "lifestyle_use" as const,
  },
  productivity: {
    category: "생산성",
    title: "오늘 할 일을 끝내세요.",
    titleGradientWord: "끝내세요",
    body: "캘린더, 메모, 작업이 한 화면에서 맞물립니다.",
    graphic:
      "MacBook with a clean timeline UI and iPhone beside it showing a checked task list.",
    graphicKind: "lifestyle_use" as const,
  },
  entertainment: {
    category: "엔터테인먼트",
    title: "몰입은 여기서 시작.",
    titleGradientWord: "몰입",
    body: "공간 음향과 선명한 화면으로 감상하세요.",
    graphic:
      "AirPods with spatial audio waves and floating musical notes around a relaxed listener.",
    graphicKind: "lifestyle_use" as const,
  },
  rimvioAction: {
    category: "실행",
    title: "링크가 행동이 됩니다.",
    titleGradientWord: "행동",
    body: "공유한 URL·스크린샷이 바로 Action Card로 바뀝니다.",
    graphic:
      "iPhone showing a full-bleed feed card with one bold primary pill button and soft violet gradient accent, minimal chrome.",
    graphicKind: "lifestyle_use" as const,
  },
  /** Place / food photo card — graphic = dish photo inside white rounded card. */
  foodPhoto: {
    category: "맛집",
    title: "오늘의 한 끼, 여기서.",
    titleGradientWord: "한 끼",
    body: "대표 메뉴 사진과 리뷰를 한 장에서 확인하세요.",
    graphic:
      "Inside the white card, lower half: appetizing Korean restaurant dish photo on clean plate, soft natural light, subtle shadow on white card floor — no dark full-bleed background, no UI chrome over the food.",
    graphicKind: "custom" as const,
  },
} as const satisfies Record<string, AppleMobileWebCardInput>;

export type FoodPhotoCardUiInput = {
  placeName: string;
  category?: string;
  subtitle?: string;
  dishDescription?: string;
  photoCount?: number;
};

/**
 * In-app food card layout (no fake Safari chrome) — Apple card anatomy only.
 */
export function buildFoodPhotoCardUiPrompt(input: FoodPhotoCardUiInput): string {
  const category = input.category ?? "맛집";
  const title = input.placeName.trim() || "오늘의 한 끼";
  const body =
    input.dishDescription?.trim() ??
    (input.photoCount && input.photoCount > 1
      ? `음식 사진 ${input.photoCount}장 · 스와이프로 넘겨 보기`
      : "대표 메뉴를 크게, 부가 정보는 작게.");

  return [
    "Mobile app UI card (Rimvio place discovery), NOT a browser screenshot.",
    "White rounded card (~24px radius) on #F5F5F7 background, generous padding.",
    `Top: grey category "${category}".`,
    `Bold Korean title "${title}".`,
    `Fine grey body: "${body}".`,
    `Hero: square or 4:3 food photo inset inside the card with rounded corners — premium menu photography, object-cover crop.`,
    "Optional: soft pagination dots below photo if multiple images.",
    "No iOS status bar, no apple.com nav, no stock avatar — keep Rimvio minimal.",
    "Typography: SF/Apple SD Gothic Neo style, #1D1D1F title, #6B7280 secondary.",
  ].join(" ");
}

export function buildPresetAppleMobileWebPrompt(
  preset: keyof typeof APPLE_MOBILE_WEB_CARD_PRESETS,
  options?: { brand?: "apple" | "rimvio" }
): string {
  return buildAppleMobileWebCardPrompt(APPLE_MOBILE_WEB_CARD_PRESETS[preset], options);
}

/** Short block for LLM system prompts (design suite, mockup tools). */
export function appleMobileWebUiPromptGuideKo(): string {
  return [
    "## Apple-style mobile web UI (screenshot mockup)",
    "- 고정: iOS 상태 바, 상단 헤더 태그라인, 카드 우하단 아바타, 하단 URL 내비게이션.",
    "- 카드: 흰 배경, 큰 둥근 모서리, 카테고리(회색 소)·제목(굵은 한국어)·본문(작은 한국어)·주제 그래픽.",
    "- 제목 일부에 blue-to-green 그라데이션 단어 지정 가능.",
    "- 코드: buildAppleMobileWebCardPrompt() / APPLE_MOBILE_WEB_CARD_PRESETS.",
    "- 문서: docs/APPLE_MOBILE_WEB_UI_PROMPT.md",
  ].join("\n");
}
