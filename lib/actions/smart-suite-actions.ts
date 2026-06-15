import type { ExtensionContext } from "@/lib/actions/extension-catalog";
import { buildPresetAppleMobileWebPrompt } from "@/lib/design/apple-mobile-web-ui-prompt";
import {
  aiPromptContextFromExtension,
  buildContextualSummaryPrompt,
} from "@/lib/actions/ai-prompt-context";
import { BLINK_ACTION_IDS } from "@/lib/actions/blink-feature-actions";
import {
  buildAsHotlineSearchHref,
  buildChartSummaryPrompt,
  buildChatGptPromptHref,
  buildConversationTemplatePrompt,
  buildFinanceSentimentPrompt,
  buildGoogleCalendarTemplateHref,
  buildGoogleFinanceHref,
  buildGoogleSiteImageSearchHref,
  buildInterviewQuestionsPrompt,
  buildKeyTermsPrompt,
  buildLegalChecklistPrompt,
  buildNaverFinanceSearchHref,
  buildNaverRealReviewSearchHref,
  buildPartsSearchHref,
  buildPdfSaveHref,
  buildPerplexitySearchHref,
  buildPriceAlertSearchHref,
  buildSetupGuidePrompt,
  buildStudyQaPrompt,
} from "@/lib/actions/search-urls";
import {
  createCopyOnlyAction,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import { isMapUrl } from "@/lib/enrichers/map";
import { isYouTubeDomain } from "@/lib/enrichers/youtube-url";
import { rankSmartSuites } from "@/lib/personalization/suite-profile";
import { filterSuitesByRouting } from "@/lib/routing/apply-routing";
import { ROUTE_CONFIDENCE_THRESHOLD } from "@/lib/routing/intelligent-router";
import {
  buildGoogleMapsNavigateHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import type { SmartSuite } from "@/lib/actions/smart-suite-types";
import { ALL_SMART_SUITES } from "@/lib/actions/smart-suite-types";
import type { LinkActionItem } from "@/types/database";

export type { SmartSuite } from "@/lib/actions/smart-suite-types";
export { ALL_SMART_SUITES } from "@/lib/actions/smart-suite-types";

const SUITE_PRIORITY: SmartSuite[] = ALL_SMART_SUITES;

function haystack(ctx: ExtensionContext) {
  return [ctx.sourceUrl, ctx.domain, ctx.title ?? "", ctx.description ?? ""].join(
    " "
  );
}

function query(ctx: ExtensionContext) {
  return ctx.title?.trim() || null;
}

export function detectSmartSuites(ctx: ExtensionContext): SmartSuite[] {
  const text = haystack(ctx);
  const suites = new Set<SmartSuite>();

  if (
    /finance|investing|coinmarketcap|upbit|bithumb|binance|krx|fnguide|38\.co\.kr|seekingalpha|bloomberg|reuters|주식|코인|crypto|bitcoin|etf|배당|재테크|증권|종목|금리|증시|stock|invest/i.test(
      text
    )
  ) {
    suites.add("finance");
  }

  if (
    /trip\.|booking|airbnb|agoda|hotels|skyscanner|klook|yanolja|goodchoice|airline|항공|호텔|여행|일정|맛집|관광|일몰|일출|sunset|sunrise|oia|santorini|flight|hotel|itinerary|planner/i.test(
      text
    )
  ) {
    suites.add("travel");
  }

  if (
    /coursera|udemy|khan|arxiv|scholar|\.edu|university|lecture|pdf|inflearn|class101|강의|논문|학습|교재|스터디|exam|course|tutorial|인강/i.test(
      text
    )
  ) {
    suites.add("edu");
  }

  if (
    /manual|support\.|service\.|lg\.com|samsung|diy|repair|interior|ikea|매뉴얼|수리|인테리어|가전|as센터|a\/s|설치|부품|appliance/i.test(
      text
    )
  ) {
    suites.add("home_life");
  }

  if (
    /linkedin|meetup|eventbrite|luma|vcard|명함|네트워킹|미팅|회의|초대|networking|contact|instagram|facebook|twitter|x\.com/i.test(
      text
    )
  ) {
    suites.add("social");
  }

  const routeBlocksNews =
    ctx.routing &&
    ctx.routing.confidence >= ROUTE_CONFIDENCE_THRESHOLD &&
    ctx.routing.mode === "commerce_compare";

  if (
    /news|뉴스|칼럼|기사|blog|post|article|medium|brunch|tistory|wiki|논문|paper|arxiv|editorial|report/i.test(
      text
    ) &&
    !isCommerceDomain(ctx.domain) &&
    !routeBlocksNews
  ) {
    suites.add("intellectual");
  }

  if (
    isCommerceDomain(ctx.domain) ||
    /menu|메뉴|review|후기|공연|티켓|예매|concert|festival|booking|restaurant|맛집/i.test(
      text
    )
  ) {
    suites.add("decision");
  }

  if (
    /wanted|saramin|jobkorea|linkedin\.com\/jobs|careers|recruit|채용|지원|공고|hiring|resume|cv/i.test(
      text
    )
  ) {
    suites.add("career");
  }

  if (
    /terms|policy|privacy|약관|계약|gov\.kr|go\.kr|법률|고시|신청|행정|복지|세금|마감|접수/i.test(
      text
    )
  ) {
    suites.add("legal_admin");
  }

  if (
    /workout|홈트|운동|헬스|yoga|필라테스|diet|영양|칼로리|recipe|식단|nutrition|fitness/i.test(
      text
    ) ||
    (isYouTubeDomain(ctx.domain) && /workout|홈트|운동|stretch|hiit/i.test(text))
  ) {
    suites.add("health");
  }

  if (
    /behance|dribbble|pinterest|figma|unsplash|pexels|freepik|design|portfolio|ui.?ux|mockup|레퍼런스/i.test(
      text
    )
  ) {
    suites.add("design");
  }

  if (/견적|상담|문의|quote|estimate|professional|외주|freelance/i.test(text)) {
    suites.add("execution");
  }

  const detected = SUITE_PRIORITY.filter((suite) => suites.has(suite));
  const ranked = rankSmartSuites(detected, ctx);
  return filterSuitesByRouting(ranked, ctx.routing);
}

export function parseDeadlineHint(text: string | null | undefined): string | null {
  if (!text?.trim()) {
    return null;
  }

  const dday = text.match(/D-?\s*(\d{1,3})\b/i);
  if (dday?.[1]) {
    return `D-${dday[1]}`;
  }

  const labelled = text.match(
    /(?:마감|접수.?마감|기한)\s*[:：]?\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{1,2}[.\-/]\d{1,2})/i
  );
  if (labelled?.[1]) {
    return labelled[1];
  }

  return null;
}

function blinkCustomAction(
  label: string,
  blinkAction: string,
  icon: string,
  extra?: Record<string, unknown>
): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "custom",
    label,
    payload: { icon, blinkAction, ...extra },
  };
}

function buildFinanceActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? ctx.domain.replace(/^www\./, "");

  return [
    blinkCustomAction("🔔 가격 알림 설정", BLINK_ACTION_IDS.priceAlert, "bell", {
      title: q,
      url: ctx.sourceUrl,
    }),
    createOpenAction({
      label: "📈 종목 뉴스 감정 분석",
      href: buildFinanceSentimentPrompt(q, ctx.sourceUrl),
      icon: "sparkles",
      copyText: q,
    }),
    createOpenAction({
      label: "📊 차트 요약",
      href: buildChartSummaryPrompt(q, ctx.sourceUrl),
      icon: "sparkles",
      copyText: q,
      fallbackHref: buildGoogleFinanceHref(q),
    }),
    createOpenAction({
      label: "💹 금융 뉴스",
      href: buildNaverFinanceSearchHref(q),
      icon: "link",
      copyText: q,
    }),
  ];
}

function buildTravelActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? "여행";

  const actions: LinkActionItem[] = [
    createOpenAction({
      label: "🗺️ 경로 지도 보기",
      href: buildNaverMapSearchWebHref(q),
      icon: "map",
      copyText: q,
      fallbackHref: buildGoogleMapsNavigateHref(ctx.sourceUrl),
    }),
    blinkCustomAction("💱 환율 변환", BLINK_ACTION_IDS.currencyConvert, "copy", {
      title: q,
    }),
    createOpenAction({
      label: "📅 일정 캘린더 등록",
      href: buildGoogleCalendarTemplateHref({
        title: q,
        details: ctx.sourceUrl,
      }),
      icon: "link",
      copyText: q,
    }),
  ];

  if (/flight|항공|airline|trip\.com|skyscanner/i.test(haystack(ctx))) {
    actions.push(
      createOpenAction({
        label: "✈️ 항공/숙소 비교",
        href: buildPerplexitySearchHref(`${q} 항공권 호텔 가격 비교`),
        icon: "link",
        copyText: q,
      })
    );
  }

  return actions;
}

function buildEduActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? "학습";

  return [
    createOpenAction({
      label: "❓ Q&A AI 생성",
      href: buildStudyQaPrompt(q, ctx.sourceUrl),
      icon: "sparkles",
      copyText: q,
    }),
    createOpenAction({
      label: "🔑 핵심 용어 추출",
      href: buildKeyTermsPrompt(q, ctx.sourceUrl),
      icon: "sparkles",
      copyText: q,
    }),
    blinkCustomAction("⏱ 스터디 타이머", BLINK_ACTION_IDS.studyTimer, "bell", {
      delayMinutes: 25,
      title: q,
    }),
    createOpenAction({
      label: "📄 PDF 저장",
      href: buildPdfSaveHref(ctx.sourceUrl),
      icon: "link",
      copyText: ctx.sourceUrl,
      fallbackHref: ctx.sourceUrl,
    }),
  ];
}

function buildHomeLifeActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? ctx.domain.replace(/^www\./, "");
  const brand = ctx.domain.replace(/^www\./, "").split(".")[0];

  const actions: LinkActionItem[] = [
    createOpenAction({
      label: "🔧 부품 검색/구매",
      href: buildPartsSearchHref(q),
      icon: "link",
      copyText: q,
    }),
    createOpenAction({
      label: "📋 설정 단계 가이드",
      href: buildSetupGuidePrompt(q, ctx.sourceUrl),
      icon: "sparkles",
      copyText: q,
    }),
    createOpenAction({
      label: "☎️ AS 센터 핫라인",
      href: buildAsHotlineSearchHref(brand),
      icon: "link",
      copyText: brand,
    }),
  ];

  if (ctx.phone) {
    actions.unshift(
      createOpenAction({
        label: "📞 바로 전화",
        href: `tel:${ctx.phone.replace(/\s+/g, "")}`,
        icon: "link",
        copyText: ctx.phone,
      })
    );
  }

  return actions;
}

function buildSocialActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? "연락";

  return [
    blinkCustomAction("📇 연락처 저장(vCard)", BLINK_ACTION_IDS.vcardSave, "copy", {
      title: q,
      url: ctx.sourceUrl,
    }),
    createOpenAction({
      label: "📅 캘린더 회의 추가",
      href: buildGoogleCalendarTemplateHref({
        title: q,
        details: ctx.sourceUrl,
      }),
      icon: "link",
      copyText: q,
    }),
    blinkCustomAction(
      "💬 대화 템플릿",
      BLINK_ACTION_IDS.conversationTemplate,
      "copy",
      {
        title: q,
        url: ctx.sourceUrl,
      }
    ),
    createOpenAction({
      label: "✨ DM 초안 AI",
      href: buildConversationTemplatePrompt(q, ctx.sourceUrl),
      icon: "sparkles",
      copyText: q,
    }),
  ];
}

function buildIntellectualActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx);
  const promptBase = buildContextualSummaryPrompt(
    aiPromptContextFromExtension(ctx),
    { task: "summary_keywords" }
  );
  const readPrompt = buildContextualSummaryPrompt(
    aiPromptContextFromExtension(ctx),
    { task: "read_aloud" }
  );

  const actions: LinkActionItem[] = [
    createOpenAction({
      label: "📌 3줄 요약/핵심어",
      href: buildChatGptPromptHref(promptBase),
      icon: "sparkles",
      copyText: promptBase,
    }),
    createOpenAction({
      label: "📖 요약해서 읽기",
      href: buildChatGptPromptHref(readPrompt),
      icon: "sparkles",
      copyText: readPrompt,
    }),
  ];

  if (/표|chart|data|통계|report|pdf|document|docs/i.test(haystack(ctx))) {
    actions.push(
      createOpenAction({
        label: "🖼 이미지/표 추출",
        href: buildGoogleSiteImageSearchHref(ctx.domain),
        icon: "link",
        copyText: ctx.sourceUrl,
        fallbackHref: buildPerplexitySearchHref(
          `${q ?? ctx.domain} 문서 속 표와 차트만 목록으로 정리해줘 ${ctx.sourceUrl}`
        ),
      })
    );
  }

  if (/review|후기|비교|vs|장단점|리뷰/i.test(haystack(ctx))) {
    actions.push(
      createOpenAction({
        label: "⚖️ 반박/비교",
        href: buildChatGptPromptHref(
          `${q ?? "이 상품/서비스"}의 숨은 단점과 비교군 2개, 각각 한 줄씩 정리해줘. 링크: ${ctx.sourceUrl}`
        ),
        icon: "sparkles",
        copyText: q ?? ctx.sourceUrl,
      })
    );
  }

  return actions;
}

function buildDecisionActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? ctx.domain.replace(/^www\./, "");
  const actions: LinkActionItem[] = [
    blinkCustomAction("🧮 N빵 계산", BLINK_ACTION_IDS.splitBill, "copy"),
  ];

  if (isCommerceDomain(ctx.domain)) {
    actions.push(
      createOpenAction({
        label: "🔔 최저가 추적",
        href: buildPriceAlertSearchHref(q),
        icon: "bell",
        copyText: q,
      }),
      createOpenAction({
        label: "⭐ 진짜 리뷰 필터",
        href: buildNaverRealReviewSearchHref(q),
        icon: "link",
        copyText: q,
        fallbackHref: buildPerplexitySearchHref(
          `${q} 실제 사용자 후기만 골라서 장단점 3개씩 정리해줘`
        ),
      })
    );
  }

  if (/공연|티켓|여행|trip|festival|모임|meetup|booking|hotel|flight|항공/i.test(haystack(ctx))) {
    actions.push(
      createOpenAction({
        label: "📅 스케줄 합치기",
        href: buildGoogleCalendarTemplateHref({
          title: q,
          details: ctx.sourceUrl,
        }),
        icon: "link",
        copyText: q,
      })
    );
  }

  return actions;
}

function buildExecutionActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? "링크";
  const actions: LinkActionItem[] = [
    blinkCustomAction("✉️ 메시지 템플릿", BLINK_ACTION_IDS.quoteTemplate, "copy", {
      title: q,
      url: ctx.sourceUrl,
    }),
    createOpenAction({
      label: "📄 PDF 저장",
      href: buildPdfSaveHref(ctx.sourceUrl),
      icon: "link",
      copyText: ctx.sourceUrl,
      fallbackHref: ctx.sourceUrl,
    }),
    blinkCustomAction("✅ 할 일 등록", BLINK_ACTION_IDS.todoRegister, "bell"),
  ];

  if (isMapUrl(ctx.sourceUrl) || /map|place|맛집|카페|hotspot/i.test(haystack(ctx))) {
    actions.unshift(
      createOpenAction({
        label: "📍 위치 저장/안내",
        href: buildNaverMapSearchWebHref(q),
        icon: "map",
        copyText: q,
        fallbackHref: buildGoogleMapsNavigateHref(ctx.sourceUrl),
      })
    );
  }

  return actions;
}

function buildCareerActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx);
  if (!q) {
    return [];
  }

  const prompt = `다음 채용 공고 링크에서 핵심 역량 3개를 뽑고, 일반적인 경력 기반 자기소개서 초안 2문단을 한국어로 작성해줘.\n공고: ${q}\n${ctx.sourceUrl}`;

  return [
    createOpenAction({
      label: "📝 지원서 초안 작성",
      href: buildChatGptPromptHref(prompt),
      icon: "sparkles",
      copyText: prompt,
    }),
    createOpenAction({
      label: "🎤 면접 질문 생성",
      href: buildInterviewQuestionsPrompt(q, ctx.sourceUrl),
      icon: "sparkles",
      copyText: q,
    }),
    createCopyOnlyAction(
      "📋 채용 파이프라인",
      `지원 완료 → 서류 통과 → 1차 면접 → 최종 → 합격\n${q}\n${ctx.sourceUrl}`
    ),
  ];
}

function buildLegalAdminActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? "약관";
  const deadline = parseDeadlineHint(`${ctx.title ?? ""} ${ctx.description ?? ""}`);
  const prompt = `다음 약관/정책 링크에서 사용자에게 불리할 수 있는 조항 3가지를 한국어로 3줄 요약해줘. 링크: ${ctx.sourceUrl}`;

  const actions: LinkActionItem[] = [
    createOpenAction({
      label: "⚠️ 독소 조항/핵심 요약",
      href: buildChatGptPromptHref(prompt),
      icon: "sparkles",
      copyText: prompt,
    }),
    createOpenAction({
      label: "📑 필요 서류 체크리스트",
      href: buildLegalChecklistPrompt(ctx.sourceUrl),
      icon: "sparkles",
      copyText: ctx.sourceUrl,
    }),
  ];

  if (deadline) {
    actions.push(
      blinkCustomAction("⏳ 기한/마감 관리", BLINK_ACTION_IDS.deadlineRemind, "bell", {
        deadlineLabel: deadline,
      })
    );
  } else {
    actions.push(
      createOpenAction({
        label: "⏳ 마감일 찾기",
        href: buildPerplexitySearchHref(`${q} 신청 마감일 ${ctx.sourceUrl}`),
        icon: "bell",
        copyText: q,
      })
    );
  }

  return actions;
}

function buildHealthActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? "운동";

  return [
    blinkCustomAction("⏱ 운동 타이머 시작", BLINK_ACTION_IDS.workoutTimer, "bell", {
      delayMinutes: 3,
    }),
    blinkCustomAction("🥗 식단 기록", BLINK_ACTION_IDS.mealLog, "copy", {
      title: q,
      url: ctx.sourceUrl,
    }),
    createOpenAction({
      label: "🔥 칼로리/세트 추적",
      href: buildChatGptPromptHref(
        `${q} 운동/식단 기준으로 오늘 목표 칼로리와 세트 수를 표로 정리해줘. 링크: ${ctx.sourceUrl}`
      ),
      icon: "sparkles",
      copyText: q,
    }),
  ];
}

function buildDesignActions(ctx: ExtensionContext): LinkActionItem[] {
  const q = query(ctx) ?? ctx.domain;
  const licensePrompt = `다음 디자인/이미지 링크의 상업적 이용 가능 여부와 출처 표기 조건을 ⭕ 사용 가능 / ⚠️ 저작권 주의 중 하나로 판단해 3줄로 설명해줘.\n${ctx.sourceUrl}`;
  const mobileUiMockupPrompt = buildPresetAppleMobileWebPrompt("rimvioAction", {
    brand: "rimvio",
  });

  return [
    createOpenAction({
      label: "📱 모바일 UI 목업",
      href: buildChatGptPromptHref(
        `${mobileUiMockupPrompt}\n\n위 프롬프트로 Rimvio 피드 카드 목업 이미지를 생성해줘. 레퍼런스: ${ctx.sourceUrl}`
      ),
      icon: "sparkles",
      copyText: mobileUiMockupPrompt,
    }),
    createOpenAction({
      label: "🎨 컬러 추출",
      href: buildChatGptPromptHref(
        `다음 디자인 레퍼런스에서 메인 컬러 3개를 HEX 코드로 추출해줘. 링크: ${ctx.sourceUrl}`
      ),
      icon: "sparkles",
      copyText: q,
    }),
    createOpenAction({
      label: "⭕ 라이선스 체크",
      href: buildChatGptPromptHref(licensePrompt),
      icon: "sparkles",
      copyText: licensePrompt,
    }),
    createOpenAction({
      label: "🔍 유사 레퍼런스",
      href: buildPerplexitySearchHref(`${q} 디자인 레퍼런스 유사 스타일 5개`),
      icon: "link",
      copyText: q,
    }),
  ];
}

function buildActionsForSuite(
  suite: SmartSuite,
  ctx: ExtensionContext
): LinkActionItem[] {
  switch (suite) {
    case "finance":
      return buildFinanceActions(ctx);
    case "travel":
      return buildTravelActions(ctx);
    case "edu":
      return buildEduActions(ctx);
    case "home_life":
      return buildHomeLifeActions(ctx);
    case "social":
      return buildSocialActions(ctx);
    case "intellectual":
      return buildIntellectualActions(ctx);
    case "decision":
      return buildDecisionActions(ctx);
    case "execution":
      return buildExecutionActions(ctx);
    case "career":
      return buildCareerActions(ctx);
    case "legal_admin":
      return buildLegalAdminActions(ctx);
    case "health":
      return buildHealthActions(ctx);
    case "design":
      return buildDesignActions(ctx);
  }
}

export function buildSmartSuiteActions(
  ctx: ExtensionContext,
  maxActions = 5
): LinkActionItem[] {
  const suites = detectSmartSuites(ctx);
  const actions: LinkActionItem[] = [];

  for (const suite of suites) {
    for (const action of buildActionsForSuite(suite, ctx)) {
      if (actions.length >= maxActions) {
        return actions;
      }
      actions.push(action);
    }
  }

  return actions;
}
