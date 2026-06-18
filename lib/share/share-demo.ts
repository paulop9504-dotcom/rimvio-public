/** Desktop share-flow simulation (PWA uses system Share Target). */
export const SHARE_DEMO_URL =
  "https://www.youtube.com/watch?v=yfHasxI_s2A";

export function shareDemoHref(url = SHARE_DEMO_URL) {
  return `/share?url=${encodeURIComponent(url)}`;
}
