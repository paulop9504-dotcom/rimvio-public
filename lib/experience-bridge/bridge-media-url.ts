/** https URL suitable for cross-device bridge media (not blob/local). */
export function isRemoteShareUrl(url: string | undefined): boolean {
  const value = url?.trim();
  return Boolean(value?.startsWith("https://") && !value.startsWith("blob:"));
}

/** Legacy host uploads used peer-chat bucket — invitees get 404; force re-upload. */
export function isStaleBridgeMediaUrl(url: string | undefined): boolean {
  const value = url?.trim();
  if (!value) {
    return false;
  }
  return (
    value.includes("/storage/v1/object/public/peer-chat/") &&
    value.includes("/bridge/")
  );
}

/** Skip upload only when URL is remote and still valid for bridge sharing. */
export function isUsableBridgeMediaUrl(url: string | undefined): boolean {
  return isRemoteShareUrl(url) && !isStaleBridgeMediaUrl(url);
}
