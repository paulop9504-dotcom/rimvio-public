"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HomeCountryPicker } from "@/components/home-country-picker";
import type { CountryCode } from "@/lib/links/spark-locale";
import {
  hasSetHomeCountry,
  setHomeCountry,
  suggestHomeCountryFromBrowser,
} from "@/lib/preferences/home-country";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

export function HomeCountrySetup() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CountryCode>("KR");
  const [suggested, setSuggested] = useState<CountryCode>("KR");

  useEffect(() => {
    if (hasSetHomeCountry()) {
      return;
    }

    const guess = suggestHomeCountryFromBrowser();
    setSuggested(guess);
    setSelected(guess);

    const timer = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const confirm = () => {
    setHomeCountry(selected);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="home-country-setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal
          aria-labelledby="home-country-setup-title"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className={cn("w-full max-w-md p-5", IOS.card)}
          >
            <p className={IOS.sectionLabel}>처음 설정</p>
            <h2
              id="home-country-setup-title"
              className="mt-2 text-lg font-semibold tracking-tight"
            >
              어느 나라에서 쓰세요?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              컴퓨터·폰에서 언어 고르듯,{" "}
              <strong className="font-medium text-foreground">내 나라</strong>
              를 정해 두면 여행·상상 링크가 그에 맞게 추천돼요.
            </p>

            <div className="mt-4 max-h-[min(42vh,22rem)] overflow-y-auto pr-0.5">
              <HomeCountryPicker
                value={selected}
                suggested={suggested}
                onChange={setSelected}
                compact
              />
            </div>

            <button
              type="button"
              onClick={confirm}
              className={cn("mt-5 w-full", IOS.primaryBtn, "h-12")}
            >
              {selected === suggested ? "추천대로 시작하기" : "이 나라로 시작하기"}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
