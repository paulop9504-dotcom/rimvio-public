import type { IntegrationCatalogEntry, IntegrationProviderId } from "@/lib/integrations/types";

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    id: "slack",
    label: "Slack",
    emoji: "💬",
    hint: "팀 메시지·알림을 Action에 연결",
    authKinds: ["oauth", "api_key"],
    oauthScopes: ["channels:read", "chat:write", "users:read"],
    apiKeyPlaceholder: "xoxb-… Bot User OAuth Token",
  },
  {
    id: "notion",
    label: "Notion",
    emoji: "📓",
    hint: "노트·태스크를 day-start 맥락에 반영",
    authKinds: ["oauth", "api_key"],
    apiKeyPlaceholder: "secret_… Integration Token",
  },
  {
    id: "google_calendar",
    label: "Google Calendar",
    emoji: "📅",
    hint: "일정을 prep surface로 가져오기 (읽기 전용)",
    authKinds: ["oauth"],
    oauthScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  },
  {
    id: "naver_search",
    label: "Naver Search",
    emoji: "🔍",
    hint: "검색·상품 추천 API (Client ID + Secret)",
    authKinds: ["api_key"],
    apiKeyFields: [
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "Naver Developers Client ID",
      },
      {
        key: "client_secret",
        label: "Client Secret",
        placeholder: "Naver Developers Client Secret",
        secret: true,
      },
    ],
  },
  {
    id: "openweather",
    label: "OpenWeather",
    emoji: "🌤",
    hint: "아침 브리핑·이동 맥락 날씨",
    authKinds: ["api_key"],
    apiKeyPlaceholder: "OpenWeatherMap API Key",
  },
  {
    id: "openai",
    label: "OpenAI",
    emoji: "✨",
    hint: "내 API 키로 LLM·비전 (선택)",
    authKinds: ["api_key"],
    apiKeyPlaceholder: "sk-…",
  },
];

export function catalogEntryFor(
  provider: IntegrationProviderId,
): IntegrationCatalogEntry | undefined {
  return INTEGRATION_CATALOG.find((item) => item.id === provider);
}

export function isIntegrationProviderId(value: string): value is IntegrationProviderId {
  return INTEGRATION_CATALOG.some((item) => item.id === value);
}
