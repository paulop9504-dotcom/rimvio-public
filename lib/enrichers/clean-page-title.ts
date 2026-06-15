const SITE_SUFFIX =
  /^(네이버(?:\s?(?:뉴스|블로그|카페|지도|쇼핑|페이|증권))?|Naver(?:\s?(?:News|Blog|Cafe|Map|Shopping))?|무신사|Musinsa|쿠팡|Coupang|다음|Daum|인터파크(?:\s?티켓)?|Interpark(?:\s?Ticket)?|YouTube|GitHub|Google|카카오(?:\s?(?:맵|톡|페이))?|Kakao(?:\s?(?:Map|Talk|Pay))?|한국경제|Hankyung|연합뉴스|Yonhap|YNA|11번가|G마켓|옥션|SSG|마켓컬리|올리브영|YES24|멜론|Melon)$/i;

/** Strip trailing site branding noise from scraped page titles. */
export function cleanPageTitle(
  title: string | null | undefined,
  siteName?: string | null
): string | null {
  if (!title?.trim()) {
    return null;
  }

  let cleaned = title.replace(/\s+/g, " ").trim();

  if (siteName?.trim()) {
    const escaped = siteName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(
      new RegExp(`\\s*[|\\-–—:·•]\\s*${escaped}\\s*$`, "i"),
      ""
    );
  }

  for (let pass = 0; pass < 3; pass += 1) {
    const match = cleaned.match(/^(.+?)\s*[|\-–—:·•]\s*(.+)$/);
    if (!match) {
      break;
    }

    const head = match[1].trim();
    const tail = match[2].trim();

    if (!SITE_SUFFIX.test(tail)) {
      break;
    }

    cleaned = head;
  }

  cleaned = cleaned.replace(/^["'「『]|["'」』]$/g, "").trim();

  if (cleaned.length < 2) {
    return title.trim();
  }

  return cleaned;
}
