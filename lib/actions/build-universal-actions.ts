import type { DomainKey } from "@/lib/actions/domain-context";
import {
  buildAiSummaryHref,
  buildCalendarAddHref,
  buildCoupangDeepSearchHref,
  buildEmergencyHospitalHref,
  buildFamilyLocationShareHref,
  buildGov24Href,
  buildKakaoShareCopyText,
  buildMenuComboHref,
  buildNaverWeatherHref,
  buildPrescriptionHref,
  buildTransitRouteHref,
} from "@/lib/actions/domain-deep-links";
import {
  buildDanawaSearchHref,
  buildNaverBookingSearchHref,
  buildNaverShoppingSearchHref,
  buildNaverWebSearchHref,
} from "@/lib/actions/search-urls";
import {
  UNIVERSAL_PILLAR_ICON,
  UNIVERSAL_PILLAR_LABEL,
  UNIVERSAL_PILLAR_ORDER,
  type UniversalPillar,
} from "@/lib/actions/universal-action-pillar";
import { createCallAction, createCopyOnlyAction, createOpenAction } from "@/lib/enrichers/action-factory";
import { isTelHref, toDialPrepTelHref } from "@/lib/enrichers/extract-phone";
import {
  buildNaverMapSearchHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";
import type { LinkActionItem } from "@/types/database";

export type BuildUniversalActionsInput = {
  domain: DomainKey;
  query: string;
  phone?: string | null;
  trackingNumber?: string | null;
  linkUrl?: string | null;
  linkDomain?: string | null;
  ocrText?: string | null;
  region?: string;
};

type PillarSpec = {
  href: string;
  hint: string;
  icon: string;
  copyText?: string;
  fallbackHref?: string;
  kind?: LinkActionItem["kind"];
};

type UniversalBlueprint = {
  primary: UniversalPillar;
  pillars: Record<UniversalPillar, PillarSpec>;
};

function containerSaveHref(title: string) {
  return `rimvio://container/${encodeURIComponent(title.trim() || "림비오")}`;
}

function blueprintForDomain(input: BuildUniversalActionsInput): UniversalBlueprint | null {
  const q = input.query.trim();
  if (!q && input.domain !== "health" && input.domain !== "public") {
    return null;
  }

  switch (input.domain) {
    case "dining":
      return {
        primary: "go",
        pillars: {
          go: {
            href: `tmap://search?name=${encodeURIComponent(q)}`,
            hint: "네비로 바로 이동",
            icon: "map-pin",
            copyText: q,
            fallbackHref: buildNaverMapSearchWebHref(q),
          },
          save: {
            href: buildCalendarAddHref(q, "맛집 방문"),
            hint: "캘린더에 등록",
            icon: "bookmark",
            copyText: q,
          },
          deep_dive: {
            href: buildMenuComboHref(q),
            hint: "메뉴판·가격표",
            icon: "file-text",
            copyText: q,
          },
          connect: input.phone
            ? {
                href: toDialPrepTelHref(input.phone),
                hint: "전화·예약",
                icon: "phone",
                copyText: input.phone,
              }
            : {
                href: buildNaverBookingSearchHref(q),
                hint: "예약·리뷰",
                icon: "share",
                copyText: q,
              },
        },
      };

    case "travel":
      return {
        primary: "go",
        pillars: {
          go: {
            href: buildTransitRouteHref(q),
            hint: "이동 경로·도착 시간",
            icon: "map-pin",
            copyText: q,
          },
          save: {
            href: buildCalendarAddHref(q, input.ocrText?.slice(0, 200)),
            hint: "일정 등록",
            icon: "bookmark",
            copyText: q,
          },
          deep_dive: {
            href: buildNaverWeatherHref(q),
            hint: "여행지 날씨",
            icon: "file-text",
            copyText: q,
          },
          connect: {
            href: "#copy-text",
            hint: "카톡·동행 공유",
            icon: "share",
            copyText: buildKakaoShareCopyText(q, input.linkUrl ?? undefined),
            kind: "copy",
          },
        },
      };

    case "shopping":
      return {
        primary: "deep_dive",
        pillars: {
          go: {
            href: buildNaverMapSearchHref(`${q} 매장`),
            hint: "매장·재고 찾기",
            icon: "map-pin",
            copyText: q,
            fallbackHref: buildNaverMapSearchWebHref(`${q} 매장`),
          },
          save: {
            href: buildCoupangDeepSearchHref(q),
            hint: "찜·장바구니",
            icon: "bookmark",
            copyText: q,
            fallbackHref: buildNaverShoppingSearchHref(q),
          },
          deep_dive: {
            href: buildDanawaSearchHref(q),
            hint: "상세 사양·최저가",
            icon: "file-text",
            copyText: q,
          },
          connect: {
            href: buildNaverWebSearchHref(`${q} 쿠폰`),
            hint: "할인·문의",
            icon: "share",
            copyText: q,
          },
        },
      };

    case "productivity": {
      const text = (input.ocrText ?? q).trim();
      return {
        primary: "deep_dive",
        pillars: {
          go: {
            href: buildNaverWebSearchHref(text.slice(0, 40)),
            hint: "관련 정보 찾기",
            icon: "map-pin",
            copyText: text,
          },
          save: {
            href: containerSaveHref(text.slice(0, 24) || "영수증"),
            hint: "컨테이너에 보관",
            icon: "bookmark",
            copyText: text,
          },
          deep_dive: {
            href: buildAiSummaryHref(text),
            hint: "요약본 보기",
            icon: "file-text",
            copyText: text,
          },
          connect: {
            href: `mailto:?subject=${encodeURIComponent("림비오 정리")}&body=${encodeURIComponent(text.slice(0, 500))}`,
            hint: "메일·공유",
            icon: "share",
            copyText: text,
          },
        },
      };
    }

    case "health":
      return {
        primary: "go",
        pillars: {
          go: {
            href: buildEmergencyHospitalHref(),
            hint: "가까운 병원",
            icon: "map-pin",
          },
          save: {
            href: buildPrescriptionHref(),
            hint: "처방·기록 저장",
            icon: "bookmark",
          },
          deep_dive: {
            href: buildNaverWebSearchHref(`${q || "감기"} 증상`),
            hint: "자가 진단 정보",
            icon: "file-text",
            copyText: q,
          },
          connect: {
            href: buildFamilyLocationShareHref(),
            hint: "가족에게 공유",
            icon: "share",
          },
        },
      };

    case "public":
      return {
        primary: "connect",
        pillars: {
          go: {
            href: buildGov24Href(),
            hint: "민원 창구 이동",
            icon: "map-pin",
          },
          save: {
            href: containerSaveHref("공공 서비스"),
            hint: "컨테이너 보관",
            icon: "bookmark",
          },
          deep_dive: {
            href: buildNaverWebSearchHref("정부24 이용 안내"),
            hint: "절차·서류 안내",
            icon: "file-text",
          },
          connect: {
            href: "tel:110",
            hint: "문의·상담",
            icon: "phone",
          },
        },
      };

    case "transit":
      return {
        primary: "go",
        pillars: {
          go: {
            href: KAKAO_T_APP_OPEN,
            hint: "택시·이동",
            icon: "map-pin",
          },
          save: {
            href: "#copy-text",
            hint: "주차·메모 저장",
            icon: "bookmark",
            copyText: `주차: ${q} · ${new Date().toLocaleString("ko-KR")}`,
            kind: "copy",
          },
          deep_dive: {
            href: buildNaverWebSearchHref(`${q} 막차 첫차`),
            hint: "막차·요금 확인",
            icon: "file-text",
            copyText: q,
          },
          connect: {
            href: "#copy-text",
            hint: "동행에게 공유",
            icon: "share",
            copyText: buildKakaoShareCopyText(q, input.linkUrl ?? undefined),
            kind: "copy",
          },
        },
      };

    case "home_admin":
      return {
        primary: "save",
        pillars: {
          go: {
            href: buildNaverWebSearchHref(`${input.region ?? "서울"} 분리수거`),
            hint: "분리수거 안내",
            icon: "map-pin",
          },
          save: {
            href: containerSaveHref("생활 행정"),
            hint: "컨테이너 추가",
            icon: "bookmark",
          },
          deep_dive: {
            href: buildNaverWebSearchHref("토스 정기결제 구독"),
            hint: "구독·요금 확인",
            icon: "file-text",
          },
          connect: {
            href: "tel:123",
            hint: "관공서 문의",
            icon: "phone",
          },
        },
      };

    default:
      return null;
  }
}

function pillarToAction(
  pillar: UniversalPillar,
  spec: PillarSpec,
  isPrimary: boolean
): LinkActionItem {
  const payload = {
    universalPillar: pillar,
    universalHint: spec.hint,
    universalPrimary: isPrimary,
    domainPrimary: isPrimary,
  };

  if (spec.kind === "copy" || spec.href === "#copy-text") {
    const copyAction = createCopyOnlyAction(
      UNIVERSAL_PILLAR_LABEL[pillar],
      spec.copyText ?? ""
    );
    return {
      ...copyAction,
      payload: {
        ...copyAction.payload,
        ...payload,
        icon: UNIVERSAL_PILLAR_ICON[pillar],
      },
    };
  }

  if (pillar === "connect" && isTelHref(spec.href)) {
    const call = createCallAction(spec.href.replace(/^tel(?:prompt)?:/i, ""), UNIVERSAL_PILLAR_LABEL[pillar]);
    return {
      ...call,
      payload: {
        ...call.payload,
        ...payload,
        icon: UNIVERSAL_PILLAR_ICON[pillar],
      },
    };
  }

  return createOpenAction({
    label: UNIVERSAL_PILLAR_LABEL[pillar],
    href: spec.href,
    icon: spec.icon,
    copyText: spec.copyText,
    fallbackHref: spec.fallbackHref,
    contextBoost: pillar === "go" ? "installed-app" : undefined,
    payload,
  });
}

export function buildUniversalActions(input: BuildUniversalActionsInput): LinkActionItem[] {
  const blueprint = blueprintForDomain(input);
  if (!blueprint) {
    return [];
  }

  const { primary, pillars } = blueprint;
  const ordered: UniversalPillar[] = [
    primary,
    ...UNIVERSAL_PILLAR_ORDER.filter((pillar) => pillar !== primary),
  ];

  return ordered.map((pillar, index) =>
    pillarToAction(pillar, pillars[pillar], index === 0)
  );
}

export function resolveUniversalPrimaryPillar(domain: DomainKey): UniversalPillar {
  const defaults: Record<DomainKey, UniversalPillar> = {
    dining: "go",
    travel: "go",
    shopping: "deep_dive",
    productivity: "deep_dive",
    home_admin: "save",
    health: "go",
    public: "connect",
    transit: "go",
    generic: "go",
  };
  return defaults[domain];
}
