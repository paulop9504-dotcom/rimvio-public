import type { SurfaceType } from "@/lib/surface-engine/surface-contract";

/** Subtle icon tile tint — list cards, not full-bleed gradients. */
const ACCENTS: Record<SurfaceType, string> = {
  travel: "bg-[#5B5BD6]/22 ring-[#7B7BF0]/25",
  schedule: "bg-[#E85D75]/18 ring-[#F08A9B]/22",
  reminder: "bg-[#E8A317]/18 ring-[#F0BC4A]/22",
  food: "bg-[#E87040]/18 ring-[#F0946A]/22",
  work: "bg-[#4A90D9]/18 ring-[#6AA8E8]/22",
  goal: "bg-[#3DB87A]/18 ring-[#5FD49A]/22",
  finance: "bg-[#3DB8B8]/18 ring-[#5FD4D4]/22",
  social: "bg-[#9B5BD6]/18 ring-[#B57BF0]/22",
  generic: "bg-white/[0.08] ring-white/12",
};

export function surfaceTypeAccent(type: SurfaceType): string {
  return ACCENTS[type] ?? ACCENTS.generic;
}
