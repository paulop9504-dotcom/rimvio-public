import {
  integrationOAuthCallbackUrl,
  isOAuthProviderConfigured,
} from "@/lib/integrations/oauth-providers";

export const GOOGLE_CALENDAR_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export function isGoogleCalendarOAuthConfigured(): boolean {
  return isOAuthProviderConfigured("google_calendar");
}

export function googleCalendarOAuthRedirectUri(): string {
  return integrationOAuthCallbackUrl();
}

export function googleCalendarOAuthConsoleUrl(): string {
  return "https://console.cloud.google.com/apis/credentials";
}
