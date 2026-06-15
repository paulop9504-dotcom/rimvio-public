/** Field parsers for OCR capture intents. */

export function parseAmountWon(text: string): number | null {
  const patterns = [
    /(?:합계|총액|total|amount|승인|결제)\s*[:\s]*([₩\s]*[\d,]+)\s*원?/i,
    /([₩\s]*[\d,]+)\s*원\b/i,
    /₩\s*([\d,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const value = Number(match[1].replace(/[^\d]/g, ""));
    if (value >= 100 && value <= 50_000_000) {
      return value;
    }
  }

  return null;
}

export function parseMerchantLine(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2 && line.length <= 40);

  for (const line of lines) {
    if (
      /영수증|receipt|매출|승인|카드|visa|master|합계|부가세|vat|tel|전화|사업자/i.test(
        line
      )
    ) {
      continue;
    }

    if (/^[가-힣A-Za-z0-9·&'\-\s]{2,}$/.test(line)) {
      return line.slice(0, 32);
    }
  }

  return null;
}

export function parseWifiCredentials(text: string): {
  ssid: string | null;
  password: string | null;
} {
  const ssidMatch =
    text.match(/(?:ssid|와이\s*파\s*이|wifi|network|네트워크)\s*[:\s]*([^\n\r]{2,40})/i) ??
    text.match(/(?:ssid)\s*[:\s]*([^\n\r]{2,40})/i);

  const passwordMatch =
    text.match(
      /(?:password|pw|pass|비밀번호|암호|key)\s*[:\s]*([^\n\r]{4,64})/i
    ) ?? text.match(/(?:pwd)\s*[:\s]*([^\n\r]{4,64})/i);

  return {
    ssid: ssidMatch?.[1]?.trim().replace(/["']/g, "") ?? null,
    password: passwordMatch?.[1]?.trim().replace(/["']/g, "") ?? null,
  };
}

export function parseQrOrUrl(text: string): string | null {
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  return urlMatch?.[0]?.replace(/[)\]}>,]+$/, "") ?? null;
}

export function parsePhone(text: string): string | null {
  const match = text.match(
    /\b(010[-\s]?\d{4}[-\s]?\d{4}|02[-\s]?\d{3,4}[-\s]?\d{4}|070[-\s]?\d{4}[-\s]?\d{4})\b/
  );
  return match?.[1]?.replace(/\s/g, "-") ?? null;
}

export function parseEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? null;
}

export function parseParkingInfo(text: string): {
  spot: string | null;
  until: string | null;
} {
  const spotMatch =
    text.match(/(?:주차|입차|차량|번호|spot|zone|구역)\s*[:\s#]*([A-Z0-9가-힣\-]{1,12})/i) ??
    text.match(/\b([A-Z]\d{1,3}[-\s]?[A-Z0-9]{0,4})\b/);

  const untilMatch =
    text.match(
      /(?:출차|까지|until|exit|유효)\s*[:\s]*(\d{1,2}[:시]\d{0,2}(?:분)?|\d{1,2}:\d{2})/
    ) ?? text.match(/\b(\d{1,2}:\d{2})\b/);

  return {
    spot: spotMatch?.[1]?.trim() ?? null,
    until: untilMatch?.[1]?.trim() ?? null,
  };
}

export function parseDrugName(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/복용|용법|효능|성분|주의|mg|ml|정|캡슐|tablet|capsule/i.test(line)) {
      const cleaned = line
        .replace(/^(약품명|제품명|product)\s*[:\s]*/i, "")
        .trim();
      if (cleaned.length >= 2 && cleaned.length <= 48) {
        return cleaned.slice(0, 48);
      }
    }
  }

  const inline = text.match(
    /([가-힣A-Za-z0-9+\-()]{2,30}(?:\s*\d+\s*(?:mg|ml|정|캡슐)))/i
  );
  return inline?.[1]?.trim().slice(0, 48) ?? null;
}

export function parseEventInfo(text: string): {
  title: string | null;
  date: string | null;
  venue: string | null;
} {
  const dateMatch =
    text.match(
      /\b(20\d{2}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|\d{1,2}월\s*\d{1,2}일)\b/
    ) ?? text.match(/\b(\d{1,2}:\d{2})\b/);

  const venueMatch = text.match(
    /(?:장소|venue|hall|theater|공연장|아rena|홀|센터|스타디움)\s*[:\s]*([^\n\r]{2,40})/i
  );

  const titleLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) =>
      /공연|concert|ticket|티켓|festival|전시|show|뮤지컬|콘서트/i.test(line)
    );

  return {
    title: titleLine?.slice(0, 48) ?? null,
    date: dateMatch?.[1] ?? null,
    venue: venueMatch?.[1]?.trim().slice(0, 40) ?? null,
  };
}

export function nonHangulRatio(text: string): number {
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (!letters.length) {
    return 0;
  }

  const nonHangul = letters.replace(/[가-힣]/g, "").length;
  return nonHangul / letters.length;
}

export function parseAddressQuery(text: string): string | null {
  const match = text.match(
    /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\n\r]{4,60}/
  );

  if (match?.[0]) {
    return match[0].replace(/\s+/g, " ").trim().slice(0, 80);
  }

  const roadMatch = text.match(
    /[가-힣A-Za-z0-9]+\s*(?:특별시|광역시|시|군|구)\s+[가-힣0-9\s\-]+(?:로|길|번길)\s*\d+[^\n\r]*/
  );

  return roadMatch?.[0]?.replace(/\s+/g, " ").trim().slice(0, 80) ?? null;
}
