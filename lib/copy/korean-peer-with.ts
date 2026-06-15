/** "민수와 함께" / "철수와 함께" — natural peer suffix for feed context. */
export function formatPeerWithLabel(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "";
  }
  return `${trimmed}와 함께`;
}

/** "민수랑" — experience headline peer prefix. */
export function formatPeerRangLabel(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "";
  }
  const last = trimmed.at(-1);
  if (last && /[가-힣]/u.test(last)) {
    const code = last.charCodeAt(0) - 0xac00;
    const jong = code % 28;
    if (jong === 0) {
      return `${trimmed}랑`;
    }
    if (jong === 8) {
      return `${trimmed}이랑`;
    }
  }
  return `${trimmed}랑`;
}
