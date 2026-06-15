/**
 * Google Places API key — never reuse Vision or Gemini keys (avoids 403 scope errors).
 */
export function googlePlacesApiKey(): string {
  return (
    process.env.GOOGLE_PLACES_API_KEY?.trim() ??
    process.env.GOOGLE_MAPS_API_KEY?.trim() ??
    ""
  );
}

export function isGooglePlacesConfigured(): boolean {
  return googlePlacesApiKey().length > 0;
}
