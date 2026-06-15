/** True when the user is already near the bottom of the feed thread (not reading history). */
export function isThreadNearBottom(
  node: HTMLElement,
  thresholdPx = 140,
): boolean {
  const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
  return distance <= thresholdPx;
}

export function scrollThreadToBottom(
  node: HTMLElement,
  behavior: ScrollBehavior = "auto",
): void {
  node.scrollTo({ top: node.scrollHeight, behavior });
}

/** Mobile WebViews jitter less with instant scroll than smooth. */
export function feedThreadScrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") {
    return "auto";
  }
  return window.matchMedia("(max-width: 1023px)").matches ? "auto" : "smooth";
}
