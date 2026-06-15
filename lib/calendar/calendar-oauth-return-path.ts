/** Where OAuth should land after Google Calendar connect. */
export type CalendarOAuthSurface = "sheet" | "full";

export function calendarOAuthReturnPath(
  surface: CalendarOAuthSurface,
  pathname: string,
): string {
  const base =
    pathname === "/feed" || pathname === "/"
      ? "/feed"
      : pathname.startsWith("/search")
        ? "/search"
        : "/search";
  return `${base}?calendar=${surface}`;
}
