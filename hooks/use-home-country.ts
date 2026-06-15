"use client";

import { useCallback, useEffect, useState } from "react";
import type { CountryCode } from "@/lib/links/spark-locale";
import {
  getHomeCountry,
  HOME_COUNTRY_UPDATED,
  setHomeCountry as persistHomeCountry,
} from "@/lib/preferences/home-country";

export function useHomeCountry() {
  const [homeCountry, setHomeCountryState] = useState<CountryCode | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHomeCountryState(getHomeCountry());
    setReady(true);

    const sync = () => setHomeCountryState(getHomeCountry());
    window.addEventListener(HOME_COUNTRY_UPDATED, sync);
    return () => window.removeEventListener(HOME_COUNTRY_UPDATED, sync);
  }, []);

  const setHomeCountry = useCallback((code: CountryCode) => {
    persistHomeCountry(code);
    setHomeCountryState(code);
  }, []);

  return {
    homeCountry,
    ready,
    hasSet: homeCountry != null,
    setHomeCountry,
  };
}
