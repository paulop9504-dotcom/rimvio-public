export type NormalizedAddress = {
  display: string;
  nav: string;
};

/** Strip floor/unit/basement detail — keep building number boundary for nav apps. */
export function cleanAddressForNav(fullAddress: string) {
  return fullAddress
    .replace(/[,，]?\s*(?:지하\s*)?\d+\s*층.*/iu, "")
    .replace(/[,，]?\s*\d+\s*호.*/iu, "")
    .replace(/[,，]?\s*B\d+.*/iu, "")
    .replace(/[,，]\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** display = full address; nav = building number boundary only (for map apps). */
export function normalizeAddressPair(raw: string | null | undefined): NormalizedAddress | null {
  if (!raw?.trim()) {
    return null;
  }

  const display = raw.replace(/\s+/g, " ").trim();
  const nav = cleanAddressForNav(display);

  return {
    display,
    nav: nav || display,
  };
}

export function readNavAddress(address: NormalizedAddress | null | undefined) {
  return address?.nav?.trim() || null;
}

export function readDisplayAddress(address: NormalizedAddress | null | undefined) {
  return address?.display?.trim() || null;
}
