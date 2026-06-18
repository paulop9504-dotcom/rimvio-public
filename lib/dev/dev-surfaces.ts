const DEV_COOKIE = "rimvio-dev";

const DEV_ONLY_PREFIXES = ["/demo", "/stack", "/metrics", "/actions/"];

export function isDevSurfacesEnabled(request: {
  nextUrl: URL;
  cookies: { get: (name: string) => { value: string } | undefined };
}) {
  if (process.env.NEXT_PUBLIC_DEV_SURFACES === "1") {
    return true;
  }

  if (request.nextUrl.searchParams.get("dev") === "1") {
    return true;
  }

  return request.cookies.get(DEV_COOKIE)?.value === "1";
}

export function isDevOnlyPath(pathname: string) {
  return DEV_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

export function devCookieOptions() {
  return {
    name: DEV_COOKIE,
    value: "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax" as const,
  };
}
