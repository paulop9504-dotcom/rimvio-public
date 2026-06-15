const FIRST_ACTION_KEY = "rimvio-first-action-done";
const NUDGE_SHOWN_KEY = "rimvio-pwa-nudge-shown";

export function markFirstActionSuccess() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(FIRST_ACTION_KEY, String(Date.now()));
}

export function shouldOfferPwaInstall(standalone: boolean) {
  if (typeof window === "undefined" || standalone) {
    return false;
  }

  if (!localStorage.getItem(FIRST_ACTION_KEY)) {
    return false;
  }

  return !localStorage.getItem(NUDGE_SHOWN_KEY);
}

export function markPwaInstallNudgeShown() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(NUDGE_SHOWN_KEY, "1");
}
