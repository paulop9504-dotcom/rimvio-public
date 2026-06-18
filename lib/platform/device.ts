export function isIOS() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

export function isStandalonePwa() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function supportsShareTarget() {
  return isAndroid() && !isIOS();
}

export function supportsNativeShare() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return typeof navigator.share === "function";
}
