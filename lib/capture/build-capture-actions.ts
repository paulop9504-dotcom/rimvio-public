import {
  buildMedicalSummaryPlainText,
  buildMedicalSummaryPrompt,
} from "@/lib/capture/medical-summary-template";
import {
  buildCatchtableSearchHref,
  buildGoogleCalendarTemplateHref,
  buildExamPostItPrompt,
  buildKeyTermsPrompt,
  buildNaverBookingSearchHref,
  buildNaverShoppingSearchHref,
  buildNaverWebSearchHref,
  buildPageTranslateHref,
  encodeQuery,
} from "@/lib/actions/search-urls";
import {
  formatStudyReceiptPlainText,
  buildStudyReceipt,
} from "@/lib/study/build-study-receipt";
import {
  buildGoogleImageSearchHref,
  buildGoogleLensHref,
  buildMusinsaImageStyleHref,
  buildNaverImageSearchHref,
} from "@/lib/screenshot/image-search-urls";
import {
  buildDomainActionsForCapture,
} from "@/lib/actions/enrich-link-domain-actions";
import { tryEntityArchitect } from "@/lib/action-chat/entity-action-architect";
import {
  createCallAction,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import { buildMarketCompareActions } from "@/lib/markets/build-compare-actions";
import {
  buildKakaoPaySendAction,
  buildTossSendAction,
} from "@/lib/remote/payment-links";
import { buildNaverMapSearchHref, buildNaverMapSearchWebHref } from "@/lib/resolvers/deep-links";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";
import type { CaptureIntent } from "@/lib/capture/capture-intent-types";
import type { InferredCaptureIntent } from "@/lib/capture/inferred-intent-types";
import type { LinkActionItem } from "@/types/database";
import type { VisionSnapshot } from "@/lib/vision/types";
import { isFashionVision, visionSearchQuery } from "@/lib/vision/parse-vision-response";

function buildPapagoTextHref(text: string, targetLang = "ko") {
  const params = new URLSearchParams({
    sk: "auto",
    tk: targetLang,
    st: text.slice(0, 500),
  });
  return `https://papago.naver.com/?${params.toString()}`;
}

function buildSpendHeadline(inferred: InferredCaptureIntent): string {
  if (!inferred.amountWon) {
    return inferred.merchant ?? inferred.search_query;
  }

  const merchant = inferred.merchant ? `${inferred.merchant} · ` : "";
  return `${merchant}${inferred.amountWon.toLocaleString("ko-KR")}원 결제`;
}

function buildFashionActions(query: string, vision?: VisionSnapshot | null): LinkActionItem[] {
  const searchQuery = visionSearchQuery(vision, query);
  if (!searchQuery) {
    return [];
  }

  return [
    createOpenAction({
      label: "👗 이 스타일로 쇼핑 검색",
      href: buildNaverImageSearchHref(searchQuery),
      icon: "link",
      copyText: searchQuery,
    }),
    createOpenAction({
      label: "🔎 Google 스타일 검색",
      href: buildGoogleImageSearchHref(searchQuery),
      icon: "link",
      copyText: searchQuery,
    }),
    createOpenAction({
      label: "👕 무신사에서 찾기",
      href: buildMusinsaImageStyleHref(searchQuery),
      icon: "link",
      copyText: searchQuery,
    }),
    createOpenAction({
      label: "🪞 스타일 Lens 검색",
      href: buildGoogleLensHref(searchQuery),
      icon: "link",
      copyText: searchQuery,
    }),
  ];
}

export function buildCaptureActions(
  inferred: InferredCaptureIntent,
  vision?: VisionSnapshot | null
): LinkActionItem[] {
  const query = inferred.search_query.trim();

  switch (inferred.kind) {
    case "payment_send": {
      const account = inferred.accountDisplay ?? query;
      const toss = buildTossSendAction(account);
      const kakaoPay = buildKakaoPaySendAction(account);
      return [
        createOpenAction({
          label: "💸 토스 송금",
          href: toss.href,
          icon: "link",
          copyText: toss.copyText,
          fallbackHref: toss.fallbackHref,
        }),
        createOpenAction({
          label: "💛 카카오페이 송금",
          href: kakaoPay.href,
          icon: "link",
          copyText: kakaoPay.copyText,
          fallbackHref: kakaoPay.fallbackHref,
        }),
        createOpenAction({
          label: "📋 계좌 복사",
          href: "#copy-account",
          icon: "copy",
          copyText: account,
        }),
      ];
    }

    case "menu_food": {
      const placeLabel = inferred.place_name ?? query;
      const entityFromOcr = tryEntityArchitect(inferred.ocrText ?? placeLabel);
      if (entityFromOcr?.actions.length) {
        return entityFromOcr.actions;
      }

      const domainActions = buildDomainActionsForCapture({
        kind: "menu_food",
        query: placeLabel,
        phone: inferred.phone,
      });
      if (domainActions.length >= 2) {
        return domainActions;
      }

      if (!inferred.is_ocr_relied && inferred.place_name) {
        return domainActions.length > 0
          ? domainActions
          : buildDomainActionsForCapture({ kind: "menu_food", query: placeLabel });
      }

      return domainActions;
    }

    case "product": {
      const productLabel = inferred.product_name ?? inferred.model_number ?? query;
      const visionPrimary = !inferred.is_ocr_relied
        ? [
            createOpenAction({
              label: `🛒 ${productLabel} 최저가`,
              href: buildNaverShoppingSearchHref(query),
              icon: "link",
              copyText: query,
            }),
          ]
        : [];

      const syntheticUrl = `https://rimvio.app/capture/product?q=${encodeQuery(query)}`;
      const market = buildMarketCompareActions(
        {
          sourceUrl: syntheticUrl,
          domain: "rimvio.app",
          title: query,
          appLocale: "ko",
          linkCategory: "shopping",
          sourceType: "screenshot",
        },
        { maxActions: 4 }
      );

      if (isFashionVision(vision)) {
        return [...visionPrimary, ...buildFashionActions(query, vision), ...market].slice(0, 6);
      }

      return [
        ...visionPrimary,
        ...market,
        createOpenAction({
          label: "💸 True Cost · 기회비용",
          href: "#true-cost-receipt",
          icon: "sparkles",
          copyText: query,
        }),
      ].slice(0, 5);
    }

    case "address":
    case "place": {
      const placeLabel = inferred.place_name ?? query;
      const entityFromOcr = tryEntityArchitect(inferred.ocrText ?? placeLabel);
      if (entityFromOcr?.actions.length) {
        return entityFromOcr.actions;
      }

      const domainActions = buildDomainActionsForCapture({
        kind: inferred.kind,
        query: placeLabel,
        phone: inferred.phone,
      });
      if (domainActions.length >= 2) {
        return domainActions;
      }

      const locatePrimary = !inferred.is_ocr_relied
        ? [
            createOpenAction({
              label: `🗺️ ${placeLabel} 길찾기`,
              href: buildNaverMapSearchHref(query),
              icon: "map",
              copyText: query,
              fallbackHref: buildNaverMapSearchWebHref(query),
            }),
          ]
        : [];

      return [
        ...locatePrimary,
        createOpenAction({
          label: "🚕 카카오T",
          href: KAKAO_T_APP_OPEN,
          icon: "map",
          copyText: query,
        }),
        createOpenAction({
          label: "🗺 네이버 지도",
          href: buildNaverMapSearchHref(query),
          icon: "map",
          copyText: query,
          fallbackHref: buildNaverMapSearchWebHref(query),
        }),
        createOpenAction({
          label: "📅 캐치테이블",
          href: buildCatchtableSearchHref(query),
          icon: "link",
          copyText: query,
        }),
        createOpenAction({
          label: "📋 주소 복사",
          href: "#copy-text",
          icon: "copy",
          copyText: query,
        }),
      ].slice(0, 5);
    }

    case "business_card": {
      const actions: LinkActionItem[] = [];
      if (inferred.phone) {
        actions.push(createCallAction(inferred.phone));
      }
      actions.push(
        createOpenAction({
          label: "💬 카카오톡 검색",
          href: `https://www.kakao.com/talk/search?q=${encodeQuery(query)}`,
          icon: "link",
          copyText: query,
        }),
        createOpenAction({
          label: "🔗 LinkedIn 검색",
          href: `https://www.linkedin.com/search/results/all/?keywords=${encodeQuery(query)}`,
          icon: "link",
          copyText: query,
        }),
        createOpenAction({
          label: "📋 연락처 복사",
          href: "#copy-text",
          icon: "copy",
          copyText: [query, inferred.phone, inferred.email, inferred.company]
            .filter(Boolean)
            .join("\n"),
        })
      );
      return actions.slice(0, 4);
    }

    case "receipt": {
      const domainActions = buildDomainActionsForCapture({
        kind: "receipt",
        query: inferred.merchant ?? query,
        ocrText: inferred.ocrText ?? buildSpendHeadline(inferred),
      });
      if (domainActions.length >= 2) {
        return domainActions;
      }

      return [
        createOpenAction({
          label: "💸 지출 기록",
          href: "#copy-text",
          icon: "sparkles",
          copyText: buildSpendHeadline(inferred),
        }),
        createOpenAction({
          label: "📋 영수증 복사",
          href: "#copy-text",
          icon: "copy",
          copyText: (inferred.ocrText ?? "").slice(0, 800),
        }),
        createOpenAction({
          label: "🔍 가게 검색",
          href: buildNaverWebSearchHref(inferred.merchant ?? query),
          icon: "link",
          copyText: inferred.merchant ?? query,
        }),
      ];
    }

    case "travel_booking": {
      const domainActions = buildDomainActionsForCapture({
        kind: "travel_booking",
        query,
        ocrText: inferred.ocrText,
      });
      if (domainActions.length >= 2) {
        return domainActions;
      }

      return [
        createOpenAction({
          label: "🗺 지도",
          href: buildNaverMapSearchWebHref(query),
          icon: "map",
          copyText: query,
        }),
        createOpenAction({
          label: "📅 캘린더 추가",
          href: buildGoogleCalendarTemplateHref({
            title: query,
            details: (inferred.ocrText ?? "").slice(0, 400),
          }),
          icon: "link",
          copyText: query,
        }),
        createOpenAction({
          label: "🚕 카카오T",
          href: KAKAO_T_APP_OPEN,
          icon: "map",
          copyText: query,
        }),
        createOpenAction({
          label: "✈️ Booking 검색",
          href: `https://www.booking.com/searchresults.html?ss=${encodeQuery(query)}`,
          icon: "link",
          copyText: query,
        }),
      ];
    }

    case "ticket":
      return [
        createOpenAction({
          label: "🎫 멜론티켓",
          href: "https://ticket.melon.com/",
          icon: "link",
          copyText: query,
        }),
        createOpenAction({
          label: "🗺 공연장 길찾기",
          href: buildNaverMapSearchWebHref(inferred.venue ?? query),
          icon: "map",
          copyText: inferred.venue ?? query,
        }),
        createOpenAction({
          label: "📅 캘린더",
          href: buildGoogleCalendarTemplateHref({
            title: query,
            location: inferred.venue,
            details: inferred.eventDate ?? "",
          }),
          icon: "link",
          copyText: query,
        }),
        createOpenAction({
          label: "🎟 인터파크",
          href: "https://ticket.interpark.com/",
          icon: "link",
          copyText: query,
        }),
      ];

    case "foreign_sign":
      return [
        createOpenAction({
          label: "🌏 Papago 번역",
          href: buildPapagoTextHref(query, "ko"),
          icon: "link",
          copyText: query,
        }),
        createOpenAction({
          label: "🗺 번역 후 지도",
          href: buildNaverMapSearchWebHref(query),
          icon: "map",
          copyText: query,
        }),
        createOpenAction({
          label: "🔊 오디오로 듣기",
          href: "#read-aloud",
          icon: "sparkles",
          copyText: query,
        }),
        createOpenAction({
          label: "📋 원문 복사",
          href: "#copy-text",
          icon: "copy",
          copyText: query,
        }),
      ];

    case "document_study": {
      const ocr = inferred.ocrText ?? query;
      const receipt = buildStudyReceipt({ title: query, ocrText: ocr });
      return [
        createOpenAction({
          label: "📝 시험용 30초 정리",
          href: buildExamPostItPrompt(query, ocr),
          icon: "sparkles",
          copyText: query,
        }),
        createOpenAction({
          label: "🔊 듣고 외우기",
          href: "#read-aloud",
          icon: "sparkles",
          copyText: ocr.slice(0, 800),
        }),
        createOpenAction({
          label: "🔑 핵심 용어",
          href: buildKeyTermsPrompt(query, `capture://${encodeQuery(query)}`),
          icon: "sparkles",
          copyText: query,
        }),
        createOpenAction({
          label: "📋 포스트잇 복사",
          href: "#copy-text",
          icon: "copy",
          copyText: formatStudyReceiptPlainText(receipt),
        }),
      ];
    }

    case "parking":
      return [
        createOpenAction({
          label: "📋 주차정보 복사",
          href: "#copy-text",
          icon: "copy",
          copyText: [inferred.parkingSpot, inferred.parkingUntil]
            .filter(Boolean)
            .join(" · "),
        }),
        createOpenAction({
          label: "⏰ 출차 시간 복사",
          href: "#copy-text",
          icon: "sparkles",
          copyText: inferred.parkingUntil ?? query,
        }),
        createOpenAction({
          label: "🗺 주차장 지도",
          href: buildNaverMapSearchWebHref("주차장"),
          icon: "map",
          copyText: query,
        }),
      ];

    case "wifi_qr": {
      const actions: LinkActionItem[] = [];
      if (inferred.wifiPassword) {
        actions.push(
          createOpenAction({
            label: "🔑 WiFi 비밀번호 복사",
            href: "#copy-text",
            icon: "copy",
            copyText: inferred.wifiPassword,
          })
        );
      }
      if (inferred.wifiSsid) {
        actions.push(
          createOpenAction({
            label: "📶 SSID 복사",
            href: "#copy-text",
            icon: "copy",
            copyText: inferred.wifiSsid,
          })
        );
      }
      if (inferred.urls?.[0] || inferred.target_url) {
        actions.push(
          createOpenAction({
            label: "🔗 QR 링크 열기",
            href: inferred.urls?.[0] ?? inferred.target_url!,
            icon: "link",
            copyText: inferred.urls?.[0] ?? inferred.target_url!,
          })
        );
      }
      if (actions.length === 0) {
        actions.push(
          createOpenAction({
            label: "📋 WiFi 정보 복사",
            href: "#copy-text",
            icon: "copy",
            copyText: (inferred.ocrText ?? "").slice(0, 400),
          })
        );
      }
      return actions.slice(0, 4);
    }

    case "medicine": {
      const ocr = inferred.ocrText ?? query;
      const summary = buildMedicalSummaryPlainText({
        title: inferred.drugName ?? query,
        ocrText: ocr,
      });

      return [
        createOpenAction({
          label: "📝 복용 요약",
          href: buildMedicalSummaryPrompt(inferred.drugName ?? query, ocr),
          icon: "sparkles",
          copyText: ocr.slice(0, 800),
        }),
        createOpenAction({
          label: "📋 복약 포스트잇 복사",
          href: "#copy-text",
          icon: "copy",
          copyText: summary,
        }),
        createOpenAction({
          label: "🏥 주변 약국",
          href: buildNaverMapSearchWebHref("약국"),
          icon: "map",
          copyText: "약국",
        }),
        createOpenAction({
          label: "💊 약 검색",
          href: buildNaverWebSearchHref(`${inferred.drugName ?? query} 복용법`),
          icon: "link",
          copyText: inferred.drugName ?? query,
        }),
      ];
    }

    case "url": {
      const link = inferred.urls?.[0] ?? inferred.target_url;
      const title = inferred.content_title ?? inferred.search_query;
      if (!link) {
        return title
          ? [
              createOpenAction({
                label: "📝 핵심 요약",
                href: "#copy-text",
                icon: "sparkles",
                copyText: title,
              }),
            ]
          : [];
      }

      return [
        createOpenAction({
          label: "🔗 링크 열기",
          href: link,
          icon: "link",
          copyText: link,
        }),
        createOpenAction({
          label: "📝 핵심 요약",
          href: "#copy-text",
          icon: "sparkles",
          copyText: title,
        }),
        createOpenAction({
          label: "🌏 번역 보기",
          href: buildPageTranslateHref(link, "ko", "ko"),
          icon: "link",
          copyText: link,
        }),
      ];
    }

    default:
      return [];
  }
}

export function captureRemoteSignalLine(
  inferred: Pick<InferredCaptureIntent, "kind" | "context_signal" | "amountWon" | "bankHint" | "accountDisplay" | "parkingUntil">
): string {
  if (inferred.context_signal?.trim()) {
    return inferred.context_signal;
  }

  switch (inferred.kind) {
    case "payment_send":
      return `📷 사진에서 ${inferred.bankHint ? `${inferred.bankHint} · ` : ""}계좌번호 감지 — 송금 준비됐어요`;
    case "menu_food":
      return `🍜 메뉴·맛집 감지 — 배달·예약 1-Tap`;
    case "product":
      return `🛍 상품·가격표 감지 — 비교·True Cost`;
    case "address":
    case "place":
      return `📍 주소·장소 감지 — 이동·지도 액션`;
    case "business_card":
      return `👤 명함 감지 — 연락·카톡·지도`;
    case "url":
      return `🔗 링크 캡처 — 저장·요약·공유`;
    case "receipt":
      return inferred.amountWon
        ? `🧾 영수증 · ${inferred.amountWon.toLocaleString("ko-KR")}원 — 지출 기록`
        : `🧾 영수증 감지 — 지출·가게 검색`;
    case "travel_booking":
      return `✈️ 여행 예약 감지 — 지도·캘린더·체크인`;
    case "ticket":
      return `🎫 티켓·공연 감지 — 앱·길찾기·캘린더`;
    case "foreign_sign":
      return `🌏 외국어 표지판 — Papago 번역·지도`;
    case "document_study":
      return `📖 시험 포스트잇 — 맥락·외울 것·키워드·출제각`;
    case "parking":
      return `🅿️ 주차표 감지 — ${inferred.parkingUntil ? `${inferred.parkingUntil}까지 · ` : ""}복사·알림`;
    case "wifi_qr":
      return `📶 WiFi·QR 감지 — 비밀번호·링크 1-Tap`;
    case "medicine":
      return `💊 복약 포스트잇 — 약물·복용·주의`;
    default:
      return `📷 사진에서 맥락 감지 — 1-Tap 액션`;
  }
}

export function resolveCaptureRemoteFromIntent(inferred: InferredCaptureIntent): {
  signalLine: string;
  primary: LinkActionItem | null;
  secondary: LinkActionItem[];
  confidence: number;
  packId: CaptureIntent["kind"];
  reasoning_path: string;
  is_ocr_relied: boolean;
} {
  const actions = buildCaptureActions(inferred);

  return {
    packId: inferred.kind,
    signalLine: captureRemoteSignalLine(inferred),
    primary: actions[0] ?? null,
    secondary: actions.slice(1, 4),
    confidence: Math.max(
      inferred.confidence_score,
      inferred.kind === "payment_send"
        ? 0.94
        : ["menu_food", "product", "receipt", "travel_booking"].includes(inferred.kind)
          ? 0.86
          : 0.82
    ),
    reasoning_path: inferred.reasoning_path,
    is_ocr_relied: inferred.is_ocr_relied,
  };
}
