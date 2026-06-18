/** Short branch label e.g. "떡반집 갈마점" → "갈마점" */
export function shortBranchLabel(fullName: string, brandHint: string) {
  const cleaned = fullName.trim();
  const brand = brandHint.trim();

  if (brand && cleaned.startsWith(brand)) {
    const suffix = cleaned.slice(brand.length).trim();
    if (suffix) {
      return suffix;
    }
  }

  const branchMatch = cleaned.match(/(\S+점)/);
  if (branchMatch?.[1]) {
    return branchMatch[1];
  }

  return cleaned.length > 14 ? `${cleaned.slice(0, 12)}…` : cleaned;
}

export function sharesPlaceBrand(placeName: string, brandHint: string) {
  const hint = brandHint.trim();
  if (!hint) {
    return true;
  }

  const brandToken =
    hint.replace(/\s*(본점|\S+점)\s*$/u, "").trim().split(/\s+/)[0] ??
    hint.split(/\s+/)[0] ??
    hint;

  return placeName.includes(brandToken) || hint.includes(placeName.split(/\s+/)[0] ?? "");
}
