export function readNaverApiCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

export function isNaverSearchConfigured(): boolean {
  return readNaverApiCredentials() !== null;
}
