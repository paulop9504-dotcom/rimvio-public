import { classifyLegacyPlaceProduct, isFoodVision, PRODUCT_SIGNAL } from "@/lib/capture/classify-legacy-place-product";
import {
  pickStudyHeaderFromText,
  routeCaptureEssentialDomain,
} from "@/lib/capture/capture-domain-router";
import { shouldPrefilterAsStudy } from "@/lib/capture/study-vocabulary";
import { isGarbledCaptureOcr } from "@/lib/capture/is-garbled-capture-ocr";
import { foodVisionSearchFallback } from "@/lib/capture/infer-signature-food-place";
import type { CaptureIntent, CaptureIntentKind } from "@/lib/capture/capture-intent-types";
import {
  nonHangulRatio,
  parseAddressQuery,
  parseAmountWon,
  parseDrugName,
  parseEmail,
  parseEventInfo,
  parseMerchantLine,
  parseParkingInfo,
  parsePhone,
  parseQrOrUrl,
  parseWifiCredentials,
} from "@/lib/capture/parse-capture-fields";
import { extractExplicitUrls } from "@/lib/screenshot/explicit-urls";
import { detectPaymentFromText } from "@/lib/remote/detect-input-intent";

const MENU_SIGNAL =
  /메뉴|menu|커피|라떼|아메|espresso|떡볶|치킨|피자|파스타|스테이크|샐러드|세트|set|브런치|디저트|케이크|beer|wine|cocktail|주문/i;

const FOOD_PLACE_SIGNAL =
  /카페|맛집|restaurant|cafe|베이커리|bistro|bakery|식당|kitchen|bar|pub|bbq|고기|초밥|ramen|라멘|분식/i;

const RECEIPT_SIGNAL =
  /영수증|receipt|매출|승인|approval|카드|card|visa|master|부가세|vat|합계|total|결제|payment|현금/i;

const PARKING_SIGNAL =
  /주차|parking|입차|출차|차량번호|주차번호|주차장|valet|ticket\s*#?/i;

const BUSINESS_CARD_SIGNAL =
  /명함|director|manager|ceo|cto|cfo|team\s*lead|팀장|대표|이사|과장|차장|부장|사원|staff|mobile|tel|fax|department|부서/i;

const MEDICINE_SIGNAL =
  /복용|용법|효능|주의|처방|약국|pharmacy|medicine|drug|tablet|capsule|정\b|캡슐|mg\b|ml\b/i;

const TICKET_SIGNAL =
  /티켓|ticket|공연|concert|입장|좌석|seat|예매|booking\s*no|예매번호|멜론|interpark|인터파크|yes24|뮤지컬|festival|전시회/i;

const TRAVEL_BOOKING_SIGNAL =
  /항공|flight|boarding|체크인|check[\s-]?in|호텔|hotel|airbnb|booking\.?com|expedia|trip\.com|agoda|예약번호|confirmation|pnr|itinerary|체크아웃|checkout/i;

const WIFI_SIGNAL =
  /wifi|wi-fi|와이\s*파\s*이|ssid|password|비밀번호|network|네트워크|guest\s*network|wlan/i;

const QR_SIGNAL = /qr|큐\s*알|scan\s*me|join\s*wifi|connect\s*(?:to\s*)?(?:wifi|network|ssid)/i;

const FOREIGN_SIGN_SIGNAL =
  /exit|entrance|station|smoking|push|pull|closed|hours|open\s+[\d:]|way\s+out|no\s+parking/i;

function looksLikeForeignSign(
  rawText: string,
  vision?: {
    fashionScore?: number;
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
  } | null
): boolean {
  if (isFoodVision(vision)) {
    return false;
  }

  if (/[가-힣]{4,}/.test(rawText)) {
    return false;
  }

  if (PRODUCT_SIGNAL.test(rawText) || (vision?.fashionScore ?? 0) >= 2) {
    return false;
  }

  if (/\d+\s*원|₩\s*\d|만원/i.test(rawText)) {
    return false;
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 4);

  if (lines.length === 0) {
    return false;
  }

  return lines.every((line) => nonHangulRatio(line) >= 0.55 && /[A-Za-z]/.test(line));
}

function baseIntent(
  kind: CaptureIntentKind,
  query: string,
  ocrText: string,
  extra: Partial<CaptureIntent> = {}
): CaptureIntent {
  return {
    kind,
    query,
    ocrText,
    ...extra,
  };
}

function tryStudyIntent(
  rawText: string,
  ocrText: string,
  vision?: {
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
    fashionScore?: number;
  } | null
): CaptureIntent | null {
  if (
    routeCaptureEssentialDomain({
      rawText,
      ocrText,
      vision: vision as Parameters<typeof routeCaptureEssentialDomain>[0]["vision"],
    }) === "STUDY" ||
    shouldPrefilterAsStudy(rawText)
  ) {
    const header = pickStudyHeaderFromText(rawText).slice(0, 80);
    return baseIntent("document_study", header, ocrText);
  }
  return null;
}

export function detectCaptureIntent(input: {
  text: string;
  vision?: {
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
    fashionScore?: number;
  } | null;
}): CaptureIntent | null {
  const rawText = input.text ?? "";
  const ocrText = rawText.replace(/\s+/g, " ").trim();
  const visionQuery =
    input.vision?.bestGuessLabels?.[0] ??
    input.vision?.webEntities?.[0] ??
    input.vision?.labels?.[0] ??
    "";

  if (!ocrText && !visionQuery.trim()) {
    return null;
  }

  const studyIntent = tryStudyIntent(rawText, ocrText, input.vision ?? null);
  if (studyIntent) {
    return studyIntent;
  }

  const essentialDomain = routeCaptureEssentialDomain({
    rawText,
    ocrText,
    vision: input.vision as Parameters<typeof routeCaptureEssentialDomain>[0]["vision"],
  });

  const wifi = parseWifiCredentials(rawText);
  const qrUrl = parseQrOrUrl(rawText);
  if (
    WIFI_SIGNAL.test(rawText) ||
    QR_SIGNAL.test(rawText) ||
    (wifi.ssid && wifi.password) ||
    (qrUrl && /join|invite|open|kakao|line|discord|slack|zoom/i.test(rawText))
  ) {
    const query = wifi.ssid ?? qrUrl ?? "WiFi";
    return baseIntent("wifi_qr", query, ocrText, {
      wifiSsid: wifi.ssid ?? undefined,
      wifiPassword: wifi.password ?? undefined,
      urls: qrUrl ? [qrUrl] : undefined,
    });
  }

  if (RECEIPT_SIGNAL.test(rawText)) {
    const amountWon = parseAmountWon(rawText);
    const merchant = parseMerchantLine(rawText);
    if (amountWon || merchant) {
      return baseIntent(
        "receipt",
        merchant ?? `${amountWon?.toLocaleString("ko-KR") ?? ""}원 영수증`.trim(),
        ocrText,
        { amountWon: amountWon ?? undefined, merchant: merchant ?? undefined }
      );
    }
  }

  if (PARKING_SIGNAL.test(rawText)) {
    const parking = parseParkingInfo(rawText);
    if (parking.spot || parking.until) {
      const query = [parking.spot, parking.until ? `~${parking.until}` : null]
        .filter(Boolean)
        .join(" ");
      return baseIntent("parking", query || "주차", ocrText, {
        parkingSpot: parking.spot ?? undefined,
        parkingUntil: parking.until ?? undefined,
      });
    }
  }

  if (essentialDomain === "MEDICAL" && MEDICINE_SIGNAL.test(rawText)) {
    const drugName = parseDrugName(rawText);
    if (drugName) {
      const studyBeforeMedicine = tryStudyIntent(rawText, ocrText, input.vision ?? null);
      if (studyBeforeMedicine) {
        return studyBeforeMedicine;
      }
      return baseIntent("medicine", drugName, ocrText, { drugName });
    }
  }

  if (MEDICINE_SIGNAL.test(rawText)) {
    const drugName = parseDrugName(rawText);
    if (drugName) {
      const studyBeforeMedicine = tryStudyIntent(rawText, ocrText, input.vision ?? null);
      if (studyBeforeMedicine) {
        return studyBeforeMedicine;
      }
      return baseIntent("medicine", drugName, ocrText, { drugName });
    }
  }

  if (TICKET_SIGNAL.test(rawText)) {
    const event = parseEventInfo(rawText);
    const query = event.title ?? event.venue ?? "티켓";
    return baseIntent("ticket", query, ocrText, {
      eventDate: event.date ?? undefined,
      venue: event.venue ?? undefined,
    });
  }

  if (TRAVEL_BOOKING_SIGNAL.test(rawText)) {
    const titleLine = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => TRAVEL_BOOKING_SIGNAL.test(line) && line.length <= 60);

    const query =
      titleLine ??
      rawText.match(/(?:호텔|hotel|flight|항공)\s*[:\s]*([^\n\r]{2,40})/i)?.[1] ??
      "여행 예약";

    return baseIntent("travel_booking", query.trim(), ocrText);
  }

  const payment = detectPaymentFromText(rawText);
  if (payment) {
    return baseIntent("payment_send", payment.accountDisplay, ocrText, {
      accountDisplay: payment.accountDisplay,
      bankHint: payment.bankHint,
    });
  }

  const phone = parsePhone(rawText);
  const email = parseEmail(rawText);
  if (
    BUSINESS_CARD_SIGNAL.test(rawText) ||
    (phone && email) ||
    (phone && /대표|이사|팀장|manager|director|ceo/i.test(rawText))
  ) {
    const nameLine = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^[가-힣A-Za-z\s.'-]{2,24}$/.test(line));

    return baseIntent("business_card", nameLine ?? phone ?? email ?? "명함", ocrText, {
      phone: phone ?? undefined,
      email: email ?? undefined,
      company:
        rawText
          .split(/\r?\n/)
          .find((line) => /(주)|inc\.|corp\.|co\.|ltd\.|회사|company/i.test(line))
          ?.slice(0, 40) ?? undefined,
    });
  }

  const urls = extractExplicitUrls(rawText);
  if (urls.length > 0) {
    return baseIntent("url", urls[0]!, ocrText, { urls });
  }

  if (
    isFoodVision(input.vision) &&
    (isGarbledCaptureOcr(ocrText) || ocrText.length < 28) &&
    !PRODUCT_SIGNAL.test(rawText) &&
    !/\d+\s*원|₩\s*\d|만원/i.test(rawText)
  ) {
    return baseIntent(
      "place",
      foodVisionSearchFallback(input.vision).slice(0, 80),
      ocrText
    );
  }

  if (
    isFoodVision(input.vision) &&
    !PRODUCT_SIGNAL.test(rawText) &&
    !/\d+\s*원|₩\s*\d|만원/i.test(rawText)
  ) {
    return baseIntent("place", visionQuery.trim() || "맛집", ocrText);
  }

  if (
    FOREIGN_SIGN_SIGNAL.test(rawText) &&
    !/[가-힣]{4,}/.test(rawText) &&
    !/\d+\s*원|₩\s*\d|만원/i.test(rawText)
  ) {
    const snippet =
      rawText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length >= 4) ?? rawText;
    return baseIntent("foreign_sign", snippet.slice(0, 80), ocrText);
  }

  if (looksLikeForeignSign(rawText, input.vision ?? null)) {
    const visionBlob = [
      ...(input.vision?.bestGuessLabels ?? []),
      ...(input.vision?.webEntities ?? []),
      ...(input.vision?.labels ?? []),
    ]
      .join(" ")
      .toLowerCase();

    if (
      !isFoodVision(input.vision) &&
      /product|electronics|display|device|shopping|commerce|screen|tablet|phone|gadget/i.test(
        visionBlob
      )
    ) {
      return baseIntent("product", visionQuery.trim() || ocrText.slice(0, 80), ocrText);
    }

    const snippet =
      rawText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length >= 4) ?? rawText;
    return baseIntent("foreign_sign", snippet.slice(0, 80), ocrText);
  }

  if (
    FOOD_PLACE_SIGNAL.test(rawText) &&
    (/\d+\s*원|₩|메뉴|menu/i.test(rawText) || MENU_SIGNAL.test(rawText))
  ) {
    const menuLine = rawText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .find((line) => MENU_SIGNAL.test(line) && line.length >= 3);

    const placeLine = rawText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .find((line) => FOOD_PLACE_SIGNAL.test(line));

    const query = placeLine ?? menuLine ?? "맛집";
    return baseIntent("menu_food", query.slice(0, 80), ocrText);
  }

  const addressQuery = parseAddressQuery(rawText);
  if (
    addressQuery &&
    /(?:로|길|번길)\s*\d+/.test(addressQuery) &&
    !FOOD_PLACE_SIGNAL.test(rawText) &&
    rawText.split(/\r?\n/).filter((line) => line.trim().length >= 4).length <= 2
  ) {
    return baseIntent("address", addressQuery, ocrText);
  }

  if (
    ocrText.trim().length < 16 &&
    isFoodVision(input.vision) &&
    !PRODUCT_SIGNAL.test(rawText) &&
    !/\d+\s*원|₩|메뉴|menu/i.test(rawText)
  ) {
    return baseIntent("place", visionQuery.trim() || "맛집", ocrText);
  }

  const legacyStudy = tryStudyIntent(rawText, ocrText, input.vision ?? null);
  if (legacyStudy) {
    return legacyStudy;
  }

  const legacy = classifyLegacyPlaceProduct({
    text: rawText || visionQuery,
    vision: input.vision ?? null,
  });

  if (legacy) {
    return baseIntent(legacy.kind, legacy.query, ocrText, { urls: legacy.urls });
  }

  return null;
}

export function captureIntentTitle(intent: CaptureIntent): string {
  switch (intent.kind) {
    case "payment_send":
      return `${intent.bankHint ? `${intent.bankHint} ` : ""}${intent.accountDisplay ?? intent.query}`;
    case "receipt":
      return intent.merchant
        ? `${intent.merchant}${intent.amountWon ? ` · ${intent.amountWon.toLocaleString("ko-KR")}원` : ""}`
        : intent.query;
    case "wifi_qr":
      return intent.wifiSsid ? `WiFi · ${intent.wifiSsid}` : intent.query;
    case "parking":
      return `주차 ${intent.parkingSpot ?? intent.query}`;
    case "business_card":
      return intent.query;
    case "medicine":
      return intent.drugName ?? intent.query;
    case "ticket":
      return intent.venue ? `${intent.query} · ${intent.venue}` : intent.query;
    case "travel_booking":
      return intent.query;
    case "foreign_sign":
      return intent.query.slice(0, 48);
    case "document_study":
      return intent.query.slice(0, 56);
    default:
      return intent.query;
  }
}

export function captureIntentCategory(intent: CaptureIntent): string {
  switch (intent.kind) {
    case "product":
      return "shopping";
    case "menu_food":
      return "food";
    case "travel_booking":
    case "ticket":
    case "place":
    case "address":
      return "travel";
    case "medicine":
      return "health";
    case "receipt":
      return "shopping";
    case "business_card":
      return "social";
    case "document_study":
      return "research";
    default:
      return "uncategorized";
  }
}
