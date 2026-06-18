import type { ExtensionContext } from "@/lib/actions/extension-catalog";
import {
  buildNaverBookingSearchHref,
  buildNaverWebSearchHref,
} from "@/lib/actions/search-urls";
import type { ServiceIntent } from "@/lib/actions/service-intent";
import { detectServiceIntent } from "@/lib/actions/service-intent";
import {
  buildKakaoMapSearchWebHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import {
  createCallAction,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import { pickEnrichedPhone } from "@/lib/enrichers/extract-phone";
import type { LinkActionItem } from "@/types/database";

function queryFromContext(ctx: ExtensionContext) {
  return ctx.title?.trim() || null;
}

function phoneFromContext(ctx: ExtensionContext) {
  return pickEnrichedPhone({
    phone: ctx.phone,
    title: ctx.title,
    description: ctx.description,
    sourceUrl: ctx.sourceUrl,
  });
}

function buildPhoneOrSearchAction(
  label: string,
  phone: string | null,
  searchQuery: string
): LinkActionItem {
  if (phone) {
    return createCallAction(phone, label);
  }

  return createOpenAction({
    label,
    href: buildNaverWebSearchHref(`${searchQuery} 전화번호`),
    icon: "phone",
    copyText: searchQuery,
    contextBoost: "phone",
  });
}

function buildKakaoOrDmAction(ctx: ExtensionContext, query: string) {
  const { sourceUrl } = ctx;

  if (/pf\.kakao\.com|open\.kakao\.com|kakao\.com\/channel/i.test(sourceUrl)) {
    return createOpenAction({
      label: "💬 카톡 문의",
      href: sourceUrl,
      icon: "link",
      copyText: sourceUrl,
    });
  }

  if (/instagram\.com|threads\.net/i.test(sourceUrl)) {
    return createOpenAction({
      label: "💬 DM 보내기",
      href: sourceUrl,
      icon: "link",
      copyText: sourceUrl,
    });
  }

  return createOpenAction({
    label: "💬 카톡·DM 문의",
    href: buildNaverWebSearchHref(`${query} 카카오톡 채널`),
    icon: "link",
    copyText: query,
  });
}

function brandFromDomain(domain: string) {
  const host = domain.toLowerCase().replace(/^www\./, "");
  if (host.includes("coupang")) return "쿠팡";
  if (host.includes("kurly")) return "마켓컬리";
  if (host.includes("11st")) return "11번가";
  if (host.includes("gmarket")) return "G마켓";
  if (host.includes("musinsa")) return "무신사";
  if (host.includes("baemin")) return "배민";
  if (host.includes("yogiyo")) return "요기요";
  if (host.includes("coupang") && host.includes("eats")) return "쿠팡이츠";
  return host.split(".")[0] ?? domain;
}

function buildKnownCsHref(domain: string): string | null {
  const host = domain.toLowerCase().replace(/^www\./, "");
  if (host.includes("coupang")) {
    return "https://mc.coupang.com/ssr/desktop/contact/faq";
  }
  if (host.includes("kurly")) {
    return "https://www.kurly.com/member/support";
  }
  if (host.includes("11st")) {
    return "https://www.11st.co.kr/help/helpMain.tmall";
  }
  if (host.includes("gmarket")) {
    return "https://help.gmarket.co.kr/Tcs/Main";
  }
  if (host.includes("musinsa")) {
    return "https://www.musinsa.com/cs";
  }
  if (host.includes("baemin")) {
    return "https://www.baemin.com/support";
  }
  return null;
}

function buildBeautyWellnessActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx);
  if (!query) {
    return [];
  }

  const phone = phoneFromContext(ctx);

  return [
    buildPhoneOrSearchAction("📞 전화 예약", phone, query),
    createOpenAction({
      label: "📅 네이버 예약 검색",
      href: buildNaverBookingSearchHref(query),
      icon: "link",
      copyText: query,
    }),
    buildKakaoOrDmAction(ctx, query),
  ];
}

function buildCsSupportActions(ctx: ExtensionContext): LinkActionItem[] {
  const brand = brandFromDomain(ctx.domain);
  const phone = phoneFromContext(ctx);
  const csHref = buildKnownCsHref(ctx.domain);

  const actions: LinkActionItem[] = [];

  if (csHref) {
    actions.push(
      createOpenAction({
        label: "📞 고객센터 연결",
        href: csHref,
        icon: "phone",
        copyText: csHref,
        fallbackHref: buildNaverWebSearchHref(`${brand} 고객센터 전화`),
      })
    );
  } else {
    actions.push(
      buildPhoneOrSearchAction("📞 고객센터 연결", phone, `${brand} 고객센터`)
    );
  }

  if (/order|delivery|tracking|ship|배송|택배/i.test(ctx.sourceUrl + (ctx.title ?? ""))) {
    actions.push(
      buildPhoneOrSearchAction(
        "🚚 배송기사 통화",
        phone,
        `${brand} 배송기사 전화`
      )
    );
  }

  return actions;
}

function buildRealEstateActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx);
  if (!query) {
    return [];
  }

  const phone = phoneFromContext(ctx);

  return [
    buildPhoneOrSearchAction("📞 부동산 전화", phone, query),
    buildPhoneOrSearchAction("🏠 집주인·관리실 연결", phone, `${query} 관리실`),
  ];
}

function buildProfessionalActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx);
  if (!query) {
    return [];
  }

  const phone = phoneFromContext(ctx);

  return [
    buildPhoneOrSearchAction("📞 상담 전화", phone, query),
    buildKakaoOrDmAction(ctx, query),
  ];
}

function buildRepairInstallActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx);
  if (!query) {
    return [];
  }

  const phone = phoneFromContext(ctx);

  return [
    buildPhoneOrSearchAction("📞 출장 기사 호출", phone, `${query} 출장 AS`),
    buildPhoneOrSearchAction("🔧 수리 문의", phone, `${query} AS 센터`),
  ];
}

function buildMobilityAutoActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx) ?? "자동차";

  return [
    createOpenAction({
      label: "🚨 보험사 긴급출동",
      href: buildNaverWebSearchHref("자동차 보험 긴급출동 전화"),
      icon: "phone",
      copyText: "자동차 보험 긴급출동",
      fallbackHref: buildNaverWebSearchHref(`${query} 보험사 긴급출동`),
    }),
    createOpenAction({
      label: "🔧 가까운 정비소 연결",
      href: buildNaverMapSearchWebHref(`${query} 정비소`),
      icon: "map",
      copyText: `${query} 정비소`,
      fallbackHref: buildKakaoMapSearchWebHref(`${query} 정비소`),
    }),
  ];
}

function buildEducationCoachingActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx);
  if (!query) {
    return [];
  }

  const phone = phoneFromContext(ctx);

  return [
    createOpenAction({
      label: "🎓 체험 수업 신청",
      href: buildNaverBookingSearchHref(`${query} 체험`),
      icon: "link",
      copyText: query,
      fallbackHref: buildNaverWebSearchHref(`${query} 체험 수업 신청`),
    }),
    buildPhoneOrSearchAction("📅 강사 스케줄 문의", phone, `${query} 강사`),
  ];
}

function buildEventPartyActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx);
  if (!query) {
    return [];
  }

  const phone = phoneFromContext(ctx);

  return [
    createOpenAction({
      label: "📅 예약 가능일 확인",
      href: buildNaverBookingSearchHref(query),
      icon: "link",
      copyText: query,
      fallbackHref: buildNaverWebSearchHref(`${query} 예약 가능일`),
    }),
    buildPhoneOrSearchAction("💬 견적 문의하기", phone, `${query} 견적`),
  ];
}

function buildEmergencyUtilityActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx) ?? "긴급 출장";
  const phone = phoneFromContext(ctx);

  return [
    buildPhoneOrSearchAction("🚨 긴급 출장 호출", phone, `${query} 24시`),
    buildPhoneOrSearchAction("💰 비용 견적 문의", phone, `${query} 출장 비용`),
  ];
}

function buildFreelancerGigActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx);
  if (!query) {
    return [];
  }

  const phone = phoneFromContext(ctx);
  const portfolioUrl = /behance|notion|instagram|portfolio|artstation|dribbble/i.test(
    ctx.sourceUrl
  )
    ? ctx.sourceUrl
    : buildNaverWebSearchHref(`${query} 포트폴리오`);

  return [
    createOpenAction({
      label: "🖼 포트폴리오 문의",
      href: portfolioUrl,
      icon: "link",
      copyText: query,
    }),
    buildPhoneOrSearchAction("💰 가격 견적 요청", phone, `${query} 견적`),
  ];
}

export function buildServiceIntentActions(
  intent: ServiceIntent,
  ctx: ExtensionContext
): LinkActionItem[] {
  switch (intent) {
    case "beauty_wellness":
      return buildBeautyWellnessActions(ctx);
    case "cs_support":
      return buildCsSupportActions(ctx);
    case "real_estate":
      return buildRealEstateActions(ctx);
    case "professional":
      return buildProfessionalActions(ctx);
    case "repair_install":
      return buildRepairInstallActions(ctx);
    case "mobility_auto":
      return buildMobilityAutoActions(ctx);
    case "education_coaching":
      return buildEducationCoachingActions(ctx);
    case "event_party":
      return buildEventPartyActions(ctx);
    case "emergency_utility":
      return buildEmergencyUtilityActions(ctx);
    case "freelancer_gig":
      return buildFreelancerGigActions(ctx);
  }
}

export function buildDetectedServiceIntentActions(
  ctx: ExtensionContext
): LinkActionItem[] {
  const intent = detectServiceIntent(ctx);
  if (!intent) {
    return [];
  }

  return buildServiceIntentActions(intent, ctx);
}
