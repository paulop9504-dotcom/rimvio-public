import type { LensActionType } from "@/lib/peer-chat/ai-lens/types";

export type LensActionCardVisual = {
  gradient: string;
  icon: "calendar" | "map" | "link" | "ticket" | "wallet" | "sparkles";
  subtitle: string;
};

const VISUALS: Record<LensActionType, LensActionCardVisual> = {
  schedule: {
    gradient: "from-violet-600/90 via-fuchsia-600/75 to-rose-500/80",
    icon: "calendar",
    subtitle: "탭해서 확인 후 저장",
  },
  movie_schedule: {
    gradient: "from-indigo-700/90 via-purple-600/80 to-pink-500/75",
    icon: "ticket",
    subtitle: "탭해서 일정 확인하기",
  },
  navigate: {
    gradient: "from-cyan-600/85 via-sky-600/75 to-blue-700/85",
    icon: "map",
    subtitle: "탭해서 길찾기",
  },
  transfer: {
    gradient: "from-emerald-600/85 via-teal-600/75 to-cyan-700/80",
    icon: "wallet",
    subtitle: "탭해서 송금 준비",
  },
  save_resource: {
    gradient: "from-amber-600/80 via-orange-600/75 to-rose-600/80",
    icon: "link",
    subtitle: "탭해서 저장",
  },
  open_link: {
    gradient: "from-slate-700/90 via-zinc-700/85 to-violet-800/80",
    icon: "link",
    subtitle: "탭해서 열기",
  },
};

export function lensActionCardVisual(
  actionType: LensActionType,
): LensActionCardVisual {
  return VISUALS[actionType] ?? {
    gradient: "from-violet-600/90 via-fuchsia-600/75 to-indigo-700/85",
    icon: "sparkles",
    subtitle: "탭해서 실행",
  };
}
