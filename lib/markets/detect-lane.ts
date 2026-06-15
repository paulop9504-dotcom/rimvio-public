import { isSecondhandDomain, looksLikeSecondhandTitle } from "@/lib/commerce/commerce-cleaner";
import { isTechListingTitle } from "@/lib/commerce/tech-category";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import type { ProductLane } from "@/lib/markets/types";

const FASHION_PATTERN =
  /musinsa|zigzag|ably|wconcept|29cm|무신사|패션|원피스|코트|신발|운동화|nike|adidas|gucci|prada|vintage|streetwear|grailed|depop|poshmark|zozo/i;

const BEAUTY_PATTERN =
  /oliveyoung|화장품|스킨|크림|향수|cosmetic|beauty|sephora/i;

export function detectProductLane(input: {
  title: string | null | undefined;
  domain: string | null | undefined;
  sourceUrl?: string | null;
}): ProductLane {
  const title = input.title?.trim() ?? "";
  const domain = input.domain?.trim() ?? "";
  const haystack = `${title} ${domain} ${input.sourceUrl ?? ""}`.toLowerCase();

  const secondhand =
    isSecondhandDomain(domain) ||
    looksLikeSecondhandTitle(title) ||
    /used|secondhand|preowned|中古|二手/.test(haystack);

  const tech = isTechListingTitle(title, domain);
  const fashion = FASHION_PATTERN.test(haystack);
  const beauty = BEAUTY_PATTERN.test(haystack);
  const commerce =
    isCommerceDomain(domain) ||
    /product|shop|buy|sell|price|deal|shopping|store/i.test(haystack);

  if (tech && secondhand) {
    return "tech_secondhand";
  }

  if (tech && commerce) {
    return "tech_new";
  }

  if (fashion && secondhand) {
    return "fashion_secondhand";
  }

  if (fashion && commerce) {
    return "fashion_new";
  }

  if (beauty) {
    return "beauty";
  }

  if (secondhand) {
    return "general_secondhand";
  }

  if (commerce) {
    return "general_new";
  }

  return secondhand ? "general_secondhand" : "general_new";
}
