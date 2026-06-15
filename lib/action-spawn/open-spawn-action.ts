/** Open spawn action deeplink — web URL, tel, or rimvio:// prompt. */
export function openSpawnAction(input: {
  deeplink: string;
  onPrompt?: (uri: string) => void;
}): void {
  const uri = input.deeplink.trim();
  if (!uri) {
    return;
  }

  if (uri.startsWith("rimvio://")) {
    input.onPrompt?.(uri);
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  if (uri.startsWith("tel:")) {
    window.location.href = uri;
    return;
  }

  window.open(uri, "_blank", "noopener,noreferrer");
}
