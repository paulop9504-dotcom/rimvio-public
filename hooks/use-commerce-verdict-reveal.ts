"use client";

import { useEffect, useRef, useState } from "react";
import type { CommerceVerdictKind } from "@/lib/commerce/commerce-verdict-presentation";

type RevealState = {
  stampVisible: boolean;
  heroValue: number;
  spectrumPosition: number;
  revealComplete: boolean;
};

const HERO_DURATION_MS = 400;
const SPECTRUM_DELAY_MS = 80;
const SPECTRUM_DURATION_MS = 500;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useCommerceVerdictReveal(input: {
  active: boolean;
  revealKey: string;
  kind: CommerceVerdictKind;
  targetHeroAmount: number | null;
  targetSpectrumPosition: number;
  reducedMotion: boolean;
}) {
  const playedKeysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const [state, setState] = useState<RevealState>({
    stampVisible: false,
    heroValue: input.targetHeroAmount ?? 0,
    spectrumPosition: input.targetSpectrumPosition,
    revealComplete: false,
  });

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const targetHero = input.targetHeroAmount ?? 0;
    const animateHero = input.targetHeroAmount !== null && input.targetHeroAmount > 0;
    const targetSpectrum = input.targetSpectrumPosition;
    const skipMotion =
      input.reducedMotion ||
      input.kind === "pending" ||
      playedKeysRef.current.has(input.revealKey);

    if (!input.active) {
      setState({
        stampVisible: skipMotion,
        heroValue: targetHero,
        spectrumPosition: targetSpectrum,
        revealComplete: skipMotion,
      });
      return;
    }

    if (skipMotion) {
      playedKeysRef.current.add(input.revealKey);
      setState({
        stampVisible: input.kind !== "pending",
        heroValue: targetHero,
        spectrumPosition: targetSpectrum,
        revealComplete: true,
      });
      return;
    }

    playedKeysRef.current.add(input.revealKey);

    const start = performance.now();
    setState({
      stampVisible: false,
      heroValue: 0,
      spectrumPosition: 50,
      revealComplete: false,
    });

    const tick = (now: number) => {
      const elapsed = now - start;
      const heroProgress = animateHero
        ? Math.min(1, elapsed / HERO_DURATION_MS)
        : 1;
      const heroValue = animateHero
        ? Math.round(targetHero * easeOutCubic(heroProgress))
        : targetHero;

      const spectrumElapsed = Math.max(0, elapsed - SPECTRUM_DELAY_MS);
      const spectrumProgress = Math.min(1, spectrumElapsed / SPECTRUM_DURATION_MS);
      const spectrumPosition =
        50 + (targetSpectrum - 50) * easeOutCubic(spectrumProgress);

      const revealComplete = heroProgress >= 1 && spectrumProgress >= 1;

      setState({
        stampVisible: true,
        heroValue,
        spectrumPosition,
        revealComplete,
      });

      if (!revealComplete) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    input.active,
    input.kind,
    input.reducedMotion,
    input.revealKey,
    input.targetHeroAmount,
    input.targetSpectrumPosition,
  ]);

  return state;
}
