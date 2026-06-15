/** Detect airport / long-distance travel events for prep windows. */
export function isAirportLikeTitle(title: string): boolean {
  return /(?:공항|airport|항공|인천|김포|ICN|GMP|탑승|체크인|출국|출발)/iu.test(title);
}
