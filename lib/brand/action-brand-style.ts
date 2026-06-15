/** MAIN = white shell; AUX / secondary icons = brand accent. */

export type NavAuxBrandStyle = {
  iconColor: string;
  iconBg: string;
};

export type MainActionBrandStyle = {
  textColor: string;
  borderColor: string;
  fillColor: string;
  hoverBg: string;
};

/** Shared shell — white border, transparent fill, brand label. */
export const UNIFIED_ACTION_BUTTON_STYLE: MainActionBrandStyle = {
  textColor: "#FFFFFF",
  borderColor: "rgba(255, 255, 255, 0.85)",
  fillColor: "transparent",
  hoverBg: "rgba(255, 255, 255, 0.06)",
};

export const UNIFIED_ACTION_BORDER = "rgba(255, 255, 255, 0.85)";
export const UNIFIED_ACTION_FILL = "transparent";
export const UNIFIED_ACTION_HOVER_BG = "rgba(255, 255, 255, 0.06)";

export const UNIFIED_ACTION_MONOGRAM_BG = "transparent";

const BRAND = {
  naver: "#03C75A",
  kakao: "#FEE500",
  toss: "#0064FF",
  google: "#4285F4",
  tmap: "#E63312",
  baemin: "#2AC1BC",
  coupang: "#0074E9",
  apple: "#007AFF",
  default: "#FFFFFF",
} as const;

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function resolveBrandColor(input: {
  id?: string;
  label?: string;
  deeplink?: string | null;
  href?: string | null;
  plugin?: string | null;
  provider?: string;
  type?: string;
  icon?: string;
}): string {
  const blob = [
    input.id ?? "",
    input.label ?? "",
    input.deeplink ?? "",
    input.href ?? "",
    input.plugin ?? "",
    input.provider ?? "",
    input.type ?? "",
    input.icon ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (input.id === "toss" || input.id === "kakaopay") {
    return input.id === "toss" ? BRAND.toss : BRAND.kakao;
  }

  if (/naver|nmap|map\.naver|네이버/u.test(blob) || input.icon === "N") {
    return BRAND.naver;
  }
  if (
    /kakao|taxi\.kakao|map\.kakao|카카오|kakaopay|pay\.kakao|kakao\.taxi/u.test(blob) ||
    input.icon === "T" ||
    input.icon === "K"
  ) {
    return BRAND.kakao;
  }
  if (/toss|supertoss|토스/u.test(blob)) {
    return BRAND.toss;
  }
  if (/tmap|티맵/u.test(blob)) {
    return BRAND.tmap;
  }
  if (/google\.com\/maps|maps\.google|구글\s*지도/u.test(blob)) {
    return BRAND.google;
  }
  if (/baemin|배민/u.test(blob)) {
    return BRAND.baemin;
  }
  if (/coupang|쿠팡/u.test(blob)) {
    return BRAND.coupang;
  }
  if (/maps\.apple|apple\.com\/maps/u.test(blob)) {
    return BRAND.apple;
  }
  if (input.type === "TAXI" || input.type === "TRANSIT") {
    return BRAND.kakao;
  }
  if (input.type === "NAVIGATE") {
    return BRAND.kakao;
  }
  if (input.plugin === "kakao.taxi") {
    return BRAND.kakao;
  }
  if (input.plugin === "navigation") {
    return BRAND.tmap;
  }

  return BRAND.default;
}

export function resolveMainActionBrandStyle(input: {
  id?: string;
  label?: string;
  deeplink?: string | null;
  href?: string | null;
  plugin?: string | null;
  provider?: string;
  type?: string;
}): MainActionBrandStyle {
  const textColor = resolveBrandColor(input);
  return {
    textColor,
    borderColor: UNIFIED_ACTION_BORDER,
    fillColor: UNIFIED_ACTION_FILL,
    hoverBg: UNIFIED_ACTION_HOVER_BG,
  };
}

export function resolveActionBrandAccent(input: {
  id?: string;
  label?: string;
  deeplink?: string | null;
  href?: string | null;
  plugin?: string | null;
  provider?: string;
  type?: string;
  icon?: string;
}): NavAuxBrandStyle {
  const color = resolveBrandColor(input);
  return {
    iconColor: color,
    iconBg:
      color === BRAND.default
        ? UNIFIED_ACTION_MONOGRAM_BG
        : hexToRgba(color, 0.14),
  };
}

export function resolveNavAuxBrandStyle(
  actionId: string,
  icon: string,
  label?: string,
): NavAuxBrandStyle {
  const color = resolveBrandColor({ id: actionId, icon, label });
  return {
    iconColor: color === BRAND.default ? "#FFFFFF" : color,
    iconBg: "transparent",
  };
}
