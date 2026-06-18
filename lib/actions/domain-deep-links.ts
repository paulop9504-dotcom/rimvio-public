import {
  buildDanawaSearchHref,
  buildGoogleCalendarTemplateHref,
  buildNaverBlogSearchHref,
  buildNaverShoppingSearchHref,
  buildNaverWebSearchHref,
  buildCatchtableSearchHref,
  buildNaverBookingSearchHref,
} from "@/lib/actions/search-urls";
import {
  buildNaverMapSearchHref,
  buildNaverMapSearchWebHref,
  buildGoogleMapsDirectionHref,
} from "@/lib/resolvers/deep-links";
import { buildCommerceAppHref } from "@/lib/resolvers/transport-commerce-deep-links";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";
import { createCallAction, createOpenAction } from "@/lib/enrichers/action-factory";
import type { LinkActionItem } from "@/types/database";

export function buildTmapNavigateHref(query: string, navAddress?: string | null) {
  const params = new URLSearchParams();
  params.set("name", query.trim());
  if (navAddress?.trim()) {
    params.set("address", navAddress.trim());
  }
  return `tmap://search?${params.toString()}`;
}

export function buildNaverWeatherHref(place: string) {
  return `https://m.weather.naver.com/search?query=${encodeURIComponent(place.trim())}`;
}

export function buildEmergencyHospitalHref() {
  return "https://m.e-gen.or.kr/nemc/main.do";
}

export function buildGov24Href() {
  return "https://www.gov.kr/portal/main";
}

export function buildHometaxHref() {
  return "https://hometax.go.kr";
}

export function buildOpinetHref() {
  return "https://www.opinet.co.kr/user/main/mainView.do";
}

export function buildHipassHref() {
  return "https://www.hipass.co.kr";
}

export function buildKakaoBusHref(query: string) {
  return `kakaomap://search?q=${encodeURIComponent(`${query} 버스`)}`;
}

export function buildUtaxiHref() {
  return "ut://";
}

export function buildKakaoShareCopyText(title: string, url?: string) {
  return [title, url].filter(Boolean).join("\n");
}

export function buildYanoljaSearchHref(query: string) {
  return `https://nol.yanolja.com/search?keyword=${encodeURIComponent(query.trim())}`;
}

export function buildCoupangDeepSearchHref(query: string) {
  return (
    buildCommerceAppHref(
      `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`,
      "coupang.com"
    ) ?? `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`
  );
}

export function buildDeliveryTrackHref(trackingNumber?: string) {
  const q = trackingNumber ? `택배조회 ${trackingNumber}` : "택배 배송조회";
  return buildNaverWebSearchHref(q);
}

export function buildMenuComboHref(place: string) {
  return buildNaverBlogSearchHref(`${place} 대표메뉴 추천`);
}

export function buildReviewSearchHref(place: string) {
  return buildNaverBlogSearchHref(`${place} 후기`);
}

export function buildMailtoHref(subject: string, body: string) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildAiSummaryHref(text: string) {
  const prompt = `${text.slice(0, 400)}\n\n위 내용을 3줄로 요약해줘.`;
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

export function buildRecyclingGuideHref(region = "서울") {
  return buildNaverWebSearchHref(`${region} 분리수거 요일`);
}

export function buildParkingMemoCopy(label: string) {
  return createOpenAction({
    label: "🅿️ 주차 위치 저장",
    href: "#copy-text",
    icon: "copy",
    copyText: `주차 위치: ${label} · ${new Date().toLocaleString("ko-KR")}`,
    payload: { domainSlot: "home_admin" },
  });
}

export function buildSubscriptionCheckHref() {
  return buildNaverWebSearchHref("토스 정기결제 구독 관리");
}

export function buildUtilityBillHref(kind: "electric" | "gas") {
  return kind === "electric"
    ? "https://www.kepco.co.kr"
    : buildNaverWebSearchHref("도시가스 요금 조회");
}

export function buildPrescriptionHref() {
  return "https://www.nhi.or.kr/nhis/policy/wbhaec06500m01.do";
}

export function buildFamilyLocationShareHref() {
  return "https://map.kakao.com/link/map/현위치";
}

export function buildSelfDiagnosisHref(symptom: string) {
  return buildNaverWebSearchHref(`${symptom} 증상 자가진단`);
}

export function buildCertificateAppHref() {
  return buildNaverWebSearchHref("토스 인증서 앱");
}

export function buildTransitRouteHref(query: string) {
  return buildGoogleMapsDirectionHref(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    "transit"
  );
}

export function buildCalendarAddHref(title: string, details?: string) {
  return buildGoogleCalendarTemplateHref({
    title,
    details,
  });
}

export function buildDiningNavAction(query: string, priority: number): LinkActionItem {
  return createOpenAction({
    label: "📍 위치/네비",
    href: buildTmapNavigateHref(query),
    icon: "map",
    copyText: query,
    fallbackHref: buildNaverMapSearchWebHref(query),
    contextBoost: "installed-app",
    payload: { domainPriority: priority, domainSlot: "dining_nav" },
  });
}

export function buildDiningNaverNavAction(query: string, priority: number): LinkActionItem {
  return createOpenAction({
    label: "🗺 네이버 지도",
    href: buildNaverMapSearchHref(query),
    icon: "map",
    copyText: query,
    fallbackHref: buildNaverMapSearchWebHref(query),
    contextBoost: "installed-app",
    payload: { domainPriority: priority, domainSlot: "dining_map" },
  });
}

export function buildDiningPhoneAction(phone: string, priority: number) {
  const call = createCallAction(phone);
  return {
    ...call,
    label: "📞 전화/예약",
    payload: { ...call.payload, domainPriority: priority, domainSlot: "dining_phone" },
  };
}

export function buildDiningWaitingAction(query: string, priority: number) {
  return createOpenAction({
    label: "⏰ 웨이팅 확인",
    href: buildCatchtableSearchHref(query),
    icon: "link",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "dining_wait" },
  });
}

export function buildDiningComboAction(query: string, priority: number) {
  return createOpenAction({
    label: "✨ 꿀조합 주문",
    href: buildMenuComboHref(query),
    icon: "sparkles",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "dining_combo" },
  });
}

export function buildDiningReviewAction(query: string, priority: number) {
  return createOpenAction({
    label: "📝 리뷰/사진",
    href: buildReviewSearchHref(query),
    icon: "link",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "dining_review" },
  });
}

export function buildTravelCalendarAction(title: string, details: string | undefined, priority: number) {
  return createOpenAction({
    label: "🗓️ 캘린더 등록",
    href: buildCalendarAddHref(title, details),
    icon: "calendar",
    copyText: title,
    payload: { domainPriority: priority, domainSlot: "travel_cal" },
  });
}

export function buildTravelWeatherAction(place: string, priority: number) {
  return createOpenAction({
    label: "☁️ 날씨 확인",
    href: buildNaverWeatherHref(place),
    icon: "link",
    copyText: place,
    payload: { domainPriority: priority, domainSlot: "travel_weather" },
  });
}

export function buildTravelRouteAction(query: string, priority: number) {
  return createOpenAction({
    label: "🚗 동선 짜기",
    href: buildTransitRouteHref(query),
    icon: "map",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "travel_route" },
  });
}

export function buildTravelShareAction(title: string, url: string | undefined, priority: number) {
  return createOpenAction({
    label: "📤 공유하기",
    href: "#copy-text",
    icon: "share",
    copyText: buildKakaoShareCopyText(title, url),
    payload: { domainPriority: priority, domainSlot: "travel_share" },
  });
}

export function buildTravelStayAction(query: string, priority: number) {
  return createOpenAction({
    label: "🏨 숙소 체크인",
    href: buildYanoljaSearchHref(query),
    icon: "link",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "travel_stay" },
  });
}

export function buildShoppingPriceAction(query: string, priority: number) {
  return createOpenAction({
    label: "💰 최저가 검색",
    href: buildDanawaSearchHref(query),
    icon: "link",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "shop_price" },
  });
}

export function buildShoppingCartAction(query: string, domain: string, priority: number) {
  return createOpenAction({
    label: "🛒 장바구니",
    href:
      buildCommerceAppHref(
        `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`,
        domain || "coupang.com"
      ) ?? buildCoupangDeepSearchHref(query),
    icon: "link",
    copyText: query,
    contextBoost: "installed-app",
    payload: { domainPriority: priority, domainSlot: "shop_cart" },
  });
}

export function buildShoppingDeliveryAction(tracking: string | undefined, priority: number) {
  return createOpenAction({
    label: "🚚 배송 조회",
    href: buildDeliveryTrackHref(tracking),
    icon: "link",
    copyText: tracking ?? "배송조회",
    payload: { domainPriority: priority, domainSlot: "shop_delivery" },
  });
}

export function buildShoppingCouponAction(query: string, priority: number) {
  return createOpenAction({
    label: "🏷️ 쿠폰 적용",
    href: buildNaverWebSearchHref(`${query} 쿠폰`),
    icon: "link",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "shop_coupon" },
  });
}

export function buildProductivitySummaryAction(text: string, priority: number) {
  return createOpenAction({
    label: "💡 요약하기",
    href: buildAiSummaryHref(text),
    icon: "sparkles",
    copyText: text.slice(0, 500),
    payload: { domainPriority: priority, domainSlot: "prod_summary" },
  });
}

export function buildProductivityMailAction(subject: string, body: string, priority: number) {
  return createOpenAction({
    label: "📬 메일 보내기",
    href: buildMailtoHref(subject, body),
    icon: "link",
    copyText: body,
    payload: { domainPriority: priority, domainSlot: "prod_mail" },
  });
}

export function buildProductivityCopyAction(label: string, text: string, priority: number) {
  return createOpenAction({
    label,
    href: "#copy-text",
    icon: "copy",
    copyText: text,
    payload: { domainPriority: priority, domainSlot: "prod_copy" },
  });
}

export function buildHealthHospitalAction(priority: number) {
  return createOpenAction({
    label: "🏥 야간/주말 병원",
    href: buildEmergencyHospitalHref(),
    icon: "link",
    payload: { domainPriority: priority, domainSlot: "health_er" },
  });
}

export function buildHealthPrescriptionAction(priority: number) {
  return createOpenAction({
    label: "💊 처방전 확인",
    href: buildPrescriptionHref(),
    icon: "link",
    payload: { domainPriority: priority, domainSlot: "health_rx" },
  });
}

export function buildHealthLocationShareAction(priority: number) {
  return createOpenAction({
    label: "🆘 가족 위치 공유",
    href: buildFamilyLocationShareHref(),
    icon: "share",
    payload: { domainPriority: priority, domainSlot: "health_loc" },
  });
}

export function buildHealthSelfCheckAction(symptom: string, priority: number) {
  return createOpenAction({
    label: "🌡️ 자가 진단",
    href: buildSelfDiagnosisHref(symptom || "감기"),
    icon: "link",
    copyText: symptom,
    payload: { domainPriority: priority, domainSlot: "health_self" },
  });
}

export function buildPublicDocAction(priority: number) {
  return createOpenAction({
    label: "📄 등본/초본 발급",
    href: buildGov24Href(),
    icon: "link",
    payload: { domainPriority: priority, domainSlot: "public_doc" },
  });
}

export function buildPublicTaxAction(priority: number) {
  return createOpenAction({
    label: "💰 세금 납부",
    href: buildHometaxHref(),
    icon: "link",
    payload: { domainPriority: priority, domainSlot: "public_tax" },
  });
}

export function buildPublicCertAction(priority: number) {
  return createOpenAction({
    label: "📑 인증서 보기",
    href: buildCertificateAppHref(),
    icon: "link",
    payload: { domainPriority: priority, domainSlot: "public_cert" },
  });
}

export function buildTransitGasAction(priority: number) {
  return createOpenAction({
    label: "⛽ 주유소 찾기",
    href: buildOpinetHref(),
    icon: "map",
    payload: { domainPriority: priority, domainSlot: "transit_gas" },
  });
}

export function buildTransitHipassAction(priority: number) {
  return createOpenAction({
    label: "🚗 하이패스 잔액",
    href: buildHipassHref(),
    icon: "link",
    payload: { domainPriority: priority, domainSlot: "transit_hipass" },
  });
}

export function buildTransitLastTrainAction(query: string, priority: number) {
  return createOpenAction({
    label: "🚌 막차/첫차 확인",
    href: buildKakaoBusHref(query || "현위치"),
    icon: "map",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "transit_bus" },
  });
}

export function buildTransitTaxiAction(priority: number) {
  return createOpenAction({
    label: "🚕 택시 호출",
    href: KAKAO_T_APP_OPEN,
    icon: "map",
    contextBoost: "installed-app",
    payload: { domainPriority: priority, domainSlot: "transit_taxi" },
  });
}

export function buildHomeRecyclingAction(region: string, priority: number) {
  return createOpenAction({
    label: "♻️ 분리수거 가이드",
    href: buildRecyclingGuideHref(region),
    icon: "link",
    payload: { domainPriority: priority, domainSlot: "home_recycle" },
  });
}

export function buildHomeSubscriptionAction(priority: number) {
  return createOpenAction({
    label: "💳 정기 결제 확인",
    href: buildSubscriptionCheckHref(),
    icon: "link",
    payload: { domainPriority: priority, domainSlot: "home_sub" },
  });
}

export function buildHomeUtilityAction(kind: "electric" | "gas", priority: number) {
  return createOpenAction({
    label: kind === "electric" ? "🚿 전기 요금" : "🚿 도시가스",
    href: buildUtilityBillHref(kind),
    icon: "link",
    payload: { domainPriority: priority, domainSlot: "home_utility" },
  });
}

export function buildNaverReservationAction(query: string, priority: number) {
  return createOpenAction({
    label: "📅 네이버 예약",
    href: buildNaverBookingSearchHref(query),
    icon: "link",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "dining_book" },
  });
}

export function buildShoppingNaverAction(query: string, priority: number) {
  return createOpenAction({
    label: "🛒 네이버쇼핑",
    href: buildNaverShoppingSearchHref(query),
    icon: "link",
    copyText: query,
    payload: { domainPriority: priority, domainSlot: "shop_naver" },
  });
}
