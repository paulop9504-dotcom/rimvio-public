"use client";

import Link from "next/link";
import { Camera, FileText, Link2 } from "lucide-react";
import type { copy as copyKo } from "@/lib/copy/human-ko";

type SearchCopy = (typeof copyKo)["search"];

type SearchIngressPanelProps = {
  copy: SearchCopy;
};

export function SearchIngressPanel({ copy }: SearchIngressPanelProps) {
  return (
    <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
        {copy.ingressEyebrow}
      </p>
      <p className="mt-2 text-[20px] font-semibold leading-snug text-white/92">
        {copy.ingressTitle}
      </p>
      <p className="mt-2 max-w-[18rem] text-[13px] leading-relaxed text-white/45">
        {copy.emptySubhint}
      </p>

      <ul className="mt-6 w-full max-w-[18rem] space-y-2.5 text-left">
        <li className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
          <Camera className="size-4 shrink-0 text-rimvio-neon-cyan" aria-hidden />
          <span className="text-[13px] text-white/72">{copy.ingressPhoto}</span>
        </li>
        <li className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
          <Link2 className="size-4 shrink-0 text-rimvio-neon-magenta" aria-hidden />
          <span className="text-[13px] text-white/72">{copy.ingressLink}</span>
        </li>
        <li className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
          <FileText className="size-4 shrink-0 text-rimvio-neon-green" aria-hidden />
          <span className="text-[13px] text-white/72">{copy.ingressMemo}</span>
        </li>
      </ul>

      <p className="mt-5 max-w-[18rem] text-[12px] leading-relaxed text-white/45">
        {copy.contextSearch.ingressHint}
      </p>
      <p className="mt-2 max-w-[18rem] text-[12px] leading-relaxed text-white/38">
        {copy.aiDeferredHint}
      </p>
      <p className="mt-2 max-w-[18rem] text-[11px] leading-relaxed text-white/32">
        {copy.contextSearch.timingHint}
      </p>

      <Link
        href="/feed"
        className="mt-4 text-[13px] font-medium text-rimvio-neon-cyan/90 underline-offset-2 hover:underline"
      >
        {copy.feedLink}
      </Link>
    </div>
  );
}
