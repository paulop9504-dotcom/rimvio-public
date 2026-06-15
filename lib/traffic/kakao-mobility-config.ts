export function kakaoRestApiKey(): string {
  return (
    process.env.KAKAO_REST_API_KEY?.trim() ??
    process.env.KAKAO_MOBILITY_REST_API_KEY?.trim() ??
    ""
  );
}

export function isKakaoMobilityConfigured(): boolean {
  return Boolean(kakaoRestApiKey());
}
