export function encodeQuery(query: string) {
  return encodeURIComponent(query.trim());
}

export function buildDanawaSearchHref(query: string) {
  return `https://search.danawa.com/dsearch.php?query=${encodeQuery(query)}`;
}

export function buildBunjangSearchHref(query: string) {
  return `https://m.bunjang.co.kr/search/products?q=${encodeQuery(query)}`;
}

export function buildJoongnaSearchHref(query: string) {
  return `https://web.joongna.com/search/${encodeQuery(query)}`;
}

export function buildNaverShoppingSearchHref(query: string) {
  return `https://search.shopping.naver.com/search/all?query=${encodeQuery(query)}`;
}

export function buildNaverBlogSearchHref(query: string) {
  return `https://search.naver.com/search.naver?where=blog&query=${encodeQuery(query)}`;
}

export function buildNaverWebSearchHref(query: string) {
  return `https://search.naver.com/search.naver?query=${encodeQuery(query)}`;
}

export function buildGoogleSearchHref(query: string) {
  return `https://www.google.com/search?q=${encodeQuery(query)}`;
}

export function buildGoogleTranslateHref(pageUrl: string, targetLang = "ko") {
  return `https://translate.google.com/translate?sl=auto&tl=${targetLang}&u=${encodeURIComponent(pageUrl)}`;
}

const PAPAGO_WEBSITE_TARGETS = new Set([
  "ko",
  "en",
  "ja",
  "zh-CN",
  "zh-TW",
  "es",
  "fr",
  "de",
  "ru",
  "pt",
  "it",
  "vi",
  "th",
  "id",
  "hi",
  "ar",
]);

export function buildPapagoWebsiteHref(pageUrl: string, targetLang = "ko") {
  const params = new URLSearchParams({
    source: "auto",
    target: targetLang,
    url: pageUrl,
  });

  return `https://papago.naver.com/website?${params.toString()}`;
}

/** Prefer Papago in KR — Google Translate web is often region-blocked. */
export function buildPageTranslateHref(
  pageUrl: string,
  targetLang = "ko",
  appLocale?: string
) {
  const usePapago =
    appLocale === "ko" ||
    targetLang === "ko" ||
    targetLang === "ja" ||
    PAPAGO_WEBSITE_TARGETS.has(targetLang);

  if (usePapago && PAPAGO_WEBSITE_TARGETS.has(targetLang)) {
    return buildPapagoWebsiteHref(pageUrl, targetLang);
  }

  return buildGoogleTranslateHref(pageUrl, targetLang);
}

export function buildChatGptPromptHref(prompt: string) {
  return `https://chatgpt.com/?hints=search&q=${encodeQuery(prompt)}`;
}

export function buildPerplexitySearchHref(query: string) {
  return `https://www.perplexity.ai/search?q=${encodeQuery(query)}`;
}

export function buildQrCodeHref(targetUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(targetUrl)}`;
}

export function buildCatchtableSearchHref(placeName: string) {
  return buildNaverWebSearchHref(`${placeName} 예약`);
}

export function buildNaverBookingSearchHref(query: string) {
  return buildNaverWebSearchHref(`${query} 예약`);
}

export function buildGoogleSiteImageSearchHref(domain: string) {
  const host = domain.replace(/^www\./, "");
  return `https://www.google.com/search?q=site:${encodeQuery(host)}&tbm=isch`;
}

export function buildGoogleCalendarTemplateHref(input: {
  title: string;
  details?: string;
  location?: string;
}) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.details ?? "",
  });
  if (input.location?.trim()) {
    params.set("location", input.location.trim());
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildPdfSaveHref(pageUrl: string) {
  return `https://www.web2pdfconvert.com/url-to-pdf?url=${encodeURIComponent(pageUrl)}`;
}


export function buildNaverRealReviewSearchHref(query: string) {
  return buildNaverBlogSearchHref(`${query} 내돈내산 솔직후기 -광고`);
}

export function buildPriceAlertSearchHref(query: string) {
  return buildNaverShoppingSearchHref(`${query} 가격 알림`);
}

export function buildGoogleFinanceHref(query: string) {
  return `https://www.google.com/finance/quote/${encodeQuery(query)}`;
}

export function buildNaverFinanceSearchHref(query: string) {
  return `https://search.naver.com/search.naver?where=news&query=${encodeQuery(`${query} 주식`)}`;
}

export function buildExchangeRateHref(from = "USD", to = "KRW") {
  return `https://www.google.com/search?q=${encodeQuery(`${from} to ${to}`)}`;
}

export function buildChartSummaryPrompt(query: string, sourceUrl: string) {
  return buildChatGptPromptHref(
    `${query} 종목/자산의 최근 차트 흐름을 3줄로 요약하고, 지지·저항 포인트 2개만 bullet로 정리해줘. 링크: ${sourceUrl}`
  );
}

export function buildFinanceSentimentPrompt(query: string, sourceUrl: string) {
  return buildChatGptPromptHref(
    `${query} 관련 최근 뉴스 헤드라인 감정을 긍정/중립/부정으로 나누고, 투자자 관점 핵심 3줄만 정리해줘. 링크: ${sourceUrl}`
  );
}

export function buildStudyQaPrompt(query: string, sourceUrl: string) {
  return buildChatGptPromptHref(
    `다음 학습 링크를 읽은 학생이 물어볼 만한 질문 5개와 각각 2문장 답변을 만들어줘.\n주제: ${query}\n${sourceUrl}`
  );
}

export { buildExamPostItPrompt } from "@/lib/study/exam-postit-template";

export function buildKeyTermsPrompt(query: string, sourceUrl: string) {
  return buildChatGptPromptHref(
    `다음 학습 자료에서 핵심 용어 8개를 뽑고, 각각 한 줄 정의해줘.\n주제: ${query}\n${sourceUrl}`
  );
}

export function buildSetupGuidePrompt(query: string, sourceUrl: string) {
  return buildChatGptPromptHref(
    `다음 제품/가전 링크 기준으로 초보자용 설정 단계를 1~5단계 checklist로 만들어줘.\n제품: ${query}\n${sourceUrl}`
  );
}

export function buildPartsSearchHref(query: string) {
  return buildNaverShoppingSearchHref(`${query} 부품`);
}

export function buildAsHotlineSearchHref(brand: string) {
  return buildGoogleSearchHref(`${brand} AS 센터 전화번호`);
}

export function buildConversationTemplatePrompt(query: string, sourceUrl: string) {
  return buildChatGptPromptHref(
    `다음 링크/행사 기준으로 첫 DM·미팅 요청 메시지 템플릿 2개(짧은 버전/정중한 버전)를 한국어로 작성해줘.\n${query}\n${sourceUrl}`
  );
}

export function buildInterviewQuestionsPrompt(query: string, sourceUrl: string) {
  return buildChatGptPromptHref(
    `다음 채용 공고에서 예상 면접 질문 5개와 STAR 답변 힌트를 한국어로 작성해줘.\n공고: ${query}\n${sourceUrl}`
  );
}

export function buildLegalChecklistPrompt(sourceUrl: string) {
  return buildChatGptPromptHref(
    `다음 행정/약관 링크에서 제출해야 할 서류·필수 조건 checklist 5개를 한국어 bullet로 정리해줘. 링크: ${sourceUrl}`
  );
}
