"use client";

import { useEffect } from "react";
import { autoInitAppLocale } from "@/lib/i18n/locale-store";
import { autoInitHomeCountry } from "@/lib/preferences/home-country";

/** First launch: detect language + home country from browser — no modal. */
export function AutoLocaleBootstrap() {
  useEffect(() => {
    autoInitAppLocale();
    autoInitHomeCountry();
  }, []);

  return null;
}
