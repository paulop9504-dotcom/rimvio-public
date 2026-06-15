/** Rimvio shell — warm, calm, iOS-adjacent */
export const ACTION_SHELL = {
  bg: "#F5F3FF",
  bgGradient: "linear-gradient(180deg, #F5F3FF 0%, #FAFAFE 48%, #FFFFFF 100%)",
  surface: "rgba(255, 255, 255, 0.82)",
  surfaceSolid: "#FFFFFF",
  ink: "#1E1B4B",
  inkSecondary: "#4338CA",
  inkMuted: "#64748B",
  inkSubtle: "#94A3B8",
  border: "rgba(99, 102, 241, 0.08)",
  borderGlass: "rgba(255, 255, 255, 0.9)",
  brand: "#6366F1",
  brandDeep: "#4F46E5",
  brandSoft: "#EEF2FF",
  brandGlow: "rgba(99, 102, 241, 0.18)",
  accentWarm: "#F59E0B",
  bubbleUser: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
  bubbleUserSolid: "#6366F1",
  bubbleAi: "#FFFFFF",
  bubbleAiInk: "#334155",
  radiusCard: 22,
  radiusBubble: 18,
  radiusPill: 999,
  shadowCard: "0 12px 40px rgba(79, 70, 229, 0.08)",
  shadowBubble: "0 4px 16px rgba(79, 70, 229, 0.12)",
  fontStack:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif',
  enterEase: [0.22, 1, 0.36, 1] as const,
  enterDuration: 0.32,
} as const;

/** Suggestion chips for empty / cold start */
export const SUGGESTION_CHIPS = [
  "오늘 점심 추천",
  "일정 정리",
  "길찾기",
  "가격 알려줘",
] as const;

/** @deprecated use ACTION_SHELL */
export const ACTION_CHAT = {
  accent: ACTION_SHELL.brand,
  accentSoft: ACTION_SHELL.brandSoft,
  surface: ACTION_SHELL.surfaceSolid,
  muted: ACTION_SHELL.bubbleAi,
  ink: ACTION_SHELL.bubbleAiInk,
  inkMuted: ACTION_SHELL.inkMuted,
  bubbleUser: ACTION_SHELL.bubbleUserSolid,
  bubbleAi: ACTION_SHELL.bubbleAi,
  shadow: ACTION_SHELL.shadowCard,
  gridTile: "#FAFAFC",
} as const;
