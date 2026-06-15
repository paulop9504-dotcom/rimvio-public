/** Append query params to an app path that may already include a search string. */
export function appendAppPathQuery(
  path: string,
  params: Record<string, string | undefined>,
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const question = normalized.indexOf("?");
  const pathname = question === -1 ? normalized : normalized.slice(0, question);
  const search = question === -1 ? "" : normalized.slice(question + 1);
  const sp = new URLSearchParams(search);

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      sp.set(key, value);
    }
  }

  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function integrationStatusPath(
  nextPath: string,
  status: string,
  extra?: Record<string, string | undefined>,
): string {
  return appendAppPathQuery(nextPath, {
    integration: status,
    ...extra,
  });
}
