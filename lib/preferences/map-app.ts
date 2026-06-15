import { isIOS } from "@/lib/platform/device";

export const MAP_APP_STORAGE_KEY = "rimvio.map-app.v1";
export const MAP_APP_UPDATED = "rimvio-map-app-updated";

export type MapApp = "apple" | "google" | "naver" | "kakao";

export type MapAppOption = {
  id: MapApp;
  label: string;
  emoji: string;
  hint: string;
  badge?: string;
};

export const MAP_APP_OPTIONS: MapAppOption[] = [
  {
    id: "naver",
    label: "Naver Map",
    emoji: "🟢",
    hint: "국내 장소 · 한국어 리뷰·대중교통",
    badge: "국내 추천",
  },
  {
    id: "kakao",
    label: "Kakao Map",
    emoji: "💛",
    hint: "국내 장소 · 카카오T·주차 연결",
  },
  {
    id: "google",
    label: "Google Maps",
    emoji: "🔵",
    hint: "해외·글로벌 · 영문 장소에 강함",
    badge: "글로벌",
  },
  {
    id: "apple",
    label: "Apple Maps",
    emoji: "🍎",
    hint: "iPhone 기본 지도 · CarPlay",
  },
];

const MAP_APP_SET = new Set<MapApp>(MAP_APP_OPTIONS.map((option) => option.id));

function isMapApp(value: string): value is MapApp {
  return MAP_APP_SET.has(value as MapApp);
}

export function defaultMapApp(domestic = true): MapApp {
  if (typeof window === "undefined") {
    return domestic ? "naver" : "google";
  }

  if (isIOS() && !domestic) {
    return "apple";
  }

  return domestic ? "naver" : "google";
}

export function readMapApp(domestic = true): MapApp {
  if (typeof window === "undefined") {
    return defaultMapApp(domestic);
  }

  try {
    const raw = localStorage.getItem(MAP_APP_STORAGE_KEY);
    if (!raw) {
      return defaultMapApp(domestic);
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string" && isMapApp(parsed)) {
      return parsed;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "app" in parsed &&
      typeof (parsed as { app: string }).app === "string" &&
      isMapApp((parsed as { app: string }).app)
    ) {
      return (parsed as { app: MapApp }).app;
    }
  } catch {
    // ignore
  }

  return defaultMapApp(domestic);
}

export function writeMapApp(app: MapApp): MapApp {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        MAP_APP_STORAGE_KEY,
        JSON.stringify({ app, updatedAt: new Date().toISOString() })
      );
      window.dispatchEvent(new CustomEvent(MAP_APP_UPDATED));
    } catch {
      // ignore
    }
  }

  return app;
}

export function orderedMapAppOptions(domestic: boolean): MapAppOption[] {
  const priority: MapApp[] = domestic
    ? ["naver", "kakao", "google", "apple"]
    : ["apple", "google", "naver", "kakao"];

  const byId = new Map(MAP_APP_OPTIONS.map((option) => [option.id, option]));
  return priority
    .map((id) => byId.get(id))
    .filter((option): option is MapAppOption => Boolean(option));
}

export function labelForMapApp(app: MapApp) {
  const match = MAP_APP_OPTIONS.find((option) => option.id === app);
  return match ? `${match.emoji} ${match.label}` : app;
}
