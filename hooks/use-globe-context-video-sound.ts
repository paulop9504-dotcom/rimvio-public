"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/** Globe context video — unmute after user intent; muted autoplay fallback. */
export function useGlobeContextVideoSound(input: {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string | null;
  isVideo: boolean;
  playing: boolean;
  visible?: boolean;
  /** Pin sheet reel — user opened media intentionally. */
  soundByDefault?: boolean;
  onPlayFailed?: () => void;
}) {
  const [soundOn, setSoundOn] = useState(input.soundByDefault ?? false);
  const visible = input.visible ?? true;

  useEffect(() => {
    setSoundOn(input.soundByDefault ?? false);
  }, [input.src, input.soundByDefault]);

  const enableSound = useCallback(() => {
    const node = input.videoRef.current;
    if (node && input.isVideo) {
      node.playsInline = true;
      node.setAttribute("playsinline", "");
      node.setAttribute("webkit-playsinline", "");
      node.volume = 1;
      node.muted = false;
      if (input.playing && (input.visible ?? true)) {
        void node.play().catch(() => {
          node.muted = true;
          void node.play().catch(() => input.onPlayFailed?.());
        });
      }
    }
    setSoundOn(true);
  }, [input.isVideo, input.onPlayFailed, input.playing, input.videoRef, input.visible]);

  const disableSound = useCallback(() => {
    const node = input.videoRef.current;
    if (node && input.isVideo) {
      node.muted = true;
    }
    setSoundOn(false);
  }, [input.isVideo, input.videoRef]);

  const toggleSound = useCallback(() => {
    if (soundOn) {
      disableSound();
      return;
    }
    enableSound();
  }, [disableSound, enableSound, soundOn]);

  useEffect(() => {
    const node = input.videoRef.current;
    if (!node || !input.src || !input.isVideo) {
      return;
    }

    node.playsInline = true;
    node.setAttribute("playsinline", "");
    node.setAttribute("webkit-playsinline", "");
    node.volume = 1;
    node.muted = !soundOn;

    if (!input.playing || !visible) {
      node.pause();
      return;
    }

    void node.play().catch(() => {
      if (soundOn) {
        node.muted = true;
        void node.play().catch(() => input.onPlayFailed?.());
        return;
      }
      input.onPlayFailed?.();
    });
  }, [input.src, input.isVideo, input.playing, input.videoRef, input.onPlayFailed, soundOn, visible]);

  return { soundOn, enableSound, disableSound, toggleSound };
}
