import type { SurfaceType } from "@/lib/surface-engine/surface-contract";

export type SurfaceTypeVisual = {
  emoji: string;
  chipLabel: string;
  heroGradient: string;
};

const VISUALS: Record<SurfaceType, SurfaceTypeVisual> = {
  travel: {
    emoji: "✈️",
    chipLabel: "이동",
    heroGradient: "from-[#2a1a4e] via-[#1a1028] to-rimvio-base",
  },
  schedule: {
    emoji: "📅",
    chipLabel: "일정",
    heroGradient: "from-[#3d1520] via-[#1f0d14] to-rimvio-base",
  },
  reminder: {
    emoji: "🔔",
    chipLabel: "알림",
    heroGradient: "from-[#3d2a10] via-[#1f1608] to-rimvio-base",
  },
  food: {
    emoji: "🍽",
    chipLabel: "식사",
    heroGradient: "from-[#3d2010] via-[#1f1008] to-rimvio-base",
  },
  work: {
    emoji: "💼",
    chipLabel: "업무",
    heroGradient: "from-[#1a2a3d] via-[#0d1520] to-rimvio-base",
  },
  goal: {
    emoji: "🎯",
    chipLabel: "목표",
    heroGradient: "from-[#1a3d2a] via-[#0d2014] to-rimvio-base",
  },
  finance: {
    emoji: "💳",
    chipLabel: "돈",
    heroGradient: "from-[#1a3d3d] via-[#0d2020] to-rimvio-base",
  },
  social: {
    emoji: "💬",
    chipLabel: "소셜",
    heroGradient: "from-[#2a1a3d] via-[#140d20] to-rimvio-base",
  },
  generic: {
    emoji: "⚡",
    chipLabel: "기타",
    heroGradient: "from-[#2a2030] via-[#141018] to-rimvio-base",
  },
};

export function surfaceTypeVisual(type: SurfaceType): SurfaceTypeVisual {
  return VISUALS[type] ?? VISUALS.generic;
}
