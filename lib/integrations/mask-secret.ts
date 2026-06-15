/** Mask secrets for UI display — last 4 chars only. */

export function maskSecret(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= 4) {
    return "••••";
  }
  return `•••• ${trimmed.slice(-4)}`;
}

export function pickPrimarySecret(payload: Record<string, string | undefined>): string {
  return (
    payload.access_token?.trim() ??
    payload.api_key?.trim() ??
    payload.client_secret?.trim() ??
    payload.client_id?.trim() ??
    payload.webhook_url?.trim() ??
    ""
  );
}
