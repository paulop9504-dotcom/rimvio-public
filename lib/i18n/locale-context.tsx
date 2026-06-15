"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCopy } from "@/lib/i18n/get-copy";
import {
  autoInitAppLocale,
  LOCALE_UPDATED,
  readStoredLocale,
  resolveAppLocale,
  writeStoredLocale,
} from "@/lib/i18n/locale-store";
import type { AppLocale, Copy } from "@/lib/i18n/types";

type LocaleContextValue = {
  locale: AppLocale;
  copy: Copy;
  setLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = "ko",
}: {
  children: ReactNode;
  initialLocale?: AppLocale;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    setLocaleState(autoInitAppLocale());

    const sync = () => {
      setLocaleState(resolveAppLocale());
    };

    window.addEventListener(LOCALE_UPDATED, sync);
    return () => window.removeEventListener(LOCALE_UPDATED, sync);
  }, []);

  const setLocale = (next: AppLocale) => {
    writeStoredLocale(next);
    setLocaleState(next);
  };

  const value = useMemo(
    () => ({
      locale,
      copy: getCopy(locale),
      setLocale,
    }),
    [locale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}

export function useCopy(): Copy {
  return useLocale().copy;
}

export function useAppLocale(): AppLocale {
  return useLocale().locale;
}

/** Safe copy for components that may render outside LocaleProvider (SSR fallback). */
export function useCopySafe(): Copy {
  const context = useContext(LocaleContext);
  if (context) {
    return context.copy;
  }

  if (typeof window !== "undefined") {
    return getCopy(readStoredLocale() ?? "ko");
  }

  return getCopy("ko");
}
