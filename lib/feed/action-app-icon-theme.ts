import type { LinkActionItem } from "@/types/database";
import { readUniversalPillar } from "@/lib/actions/universal-action-pillar";

export type ActionAppIconTheme = {
  /** CSS linear-gradient */
  background: string;
  iconColor: string;
  /** Short glyph on icon (brand initial etc.) */
  monogram?: string | null;
  emphasis?: boolean;
};

const FALLBACK_THEMES: ActionAppIconTheme[] = [
  {
    background: "linear-gradient(180deg, #5AC8FA 0%, #007AFF 100%)",
    iconColor: "#FFFFFF",
  },
  {
    background: "linear-gradient(180deg, #FF9F0A 0%, #FF6723 100%)",
    iconColor: "#FFFFFF",
  },
  {
    background: "linear-gradient(180deg, #34C759 0%, #248A3D 100%)",
    iconColor: "#FFFFFF",
  },
  {
    background: "linear-gradient(180deg, #BF5AF2 0%, #AF52DE 100%)",
    iconColor: "#FFFFFF",
  },
];

function navTheme(): ActionAppIconTheme {
  return {
    background: "linear-gradient(180deg, #64B5F6 0%, #1E88E5 100%)",
    iconColor: "#FFFFFF",
    monogram: "T",
  };
}

function kakaoTheme(): ActionAppIconTheme {
  return {
    background: "linear-gradient(180deg, #FFE066 0%, #FEE500 100%)",
    iconColor: "#3C1E1E",
    monogram: "K",
  };
}

function phoneTheme(): ActionAppIconTheme {
  return {
    background: "linear-gradient(180deg, #65D36E 0%, #34C759 100%)",
    iconColor: "#FFFFFF",
  };
}

function youtubeTheme(): ActionAppIconTheme {
  return {
    background: "linear-gradient(180deg, #FF5A5F 0%, #FF0033 100%)",
    iconColor: "#FFFFFF",
    emphasis: true,
  };
}

function shoppingTheme(): ActionAppIconTheme {
  return {
    background: "linear-gradient(180deg, #FFB340 0%, #FF9500 100%)",
    iconColor: "#FFFFFF",
  };
}

function calendarTheme(): ActionAppIconTheme {
  return {
    background: "linear-gradient(180deg, #FF6961 0%, #FF3B30 100%)",
    iconColor: "#FFFFFF",
  };
}

function webTheme(): ActionAppIconTheme {
  return {
    background: "linear-gradient(180deg, #E5E7EB 0%, #9CA3AF 100%)",
    iconColor: "#FFFFFF",
  };
}

export function resolveActionAppIconTheme(
  action: LinkActionItem,
  index = 0,
  options?: { primary?: boolean }
): ActionAppIconTheme {
  const label = action.label.toLowerCase();
  const href = (action.href ?? "").toLowerCase();
  const pillar = readUniversalPillar(action);

  if (options?.primary) {
    if (/영상|재생|youtube|▶/.test(label) || /youtube\.com|youtu\.be/.test(href)) {
      return youtubeTheme();
    }
    if (/네비|길찾|navigation|tmap|nmap|kakaomap|maps/.test(`${label} ${href}`)) {
      return navTheme();
    }
  }

  if (/카카오|kakao/.test(`${label} ${href}`)) {
    return kakaoTheme();
  }
  if (/네비|길찾|navigation|tmap|nmap|지도|map/.test(`${label} ${href}`)) {
    return navTheme();
  }
  if (/연락|전화|tel|call/.test(`${label} ${href}`)) {
    return phoneTheme();
  }
  if (/홈페이지|website|http/.test(label) || /^https?:/.test(href)) {
    return webTheme();
  }
  if (/쇼핑|구매|cart|쿠폰|타임딜/.test(label)) {
    return shoppingTheme();
  }
  if (/일정|calendar|예약/.test(label)) {
    return calendarTheme();
  }
  if (/영상|재생|youtube|▶/.test(label) || /youtube\.com|youtu\.be/.test(href)) {
    return youtubeTheme();
  }

  if (pillar === "go") {
    return navTheme();
  }
  if (pillar === "connect") {
    return phoneTheme();
  }

  const base = FALLBACK_THEMES[index % FALLBACK_THEMES.length]!;
  return options?.primary ? { ...base, emphasis: true } : base;
}
