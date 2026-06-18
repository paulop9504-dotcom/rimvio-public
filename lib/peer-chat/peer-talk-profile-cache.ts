/** @톡 검색 — 버블/프로필 API 결과를 동기 검색에 반영 */

export type TalkProfileSearchFields = {
  displayName: string | null;
  rimvioId: string | null;
  emailLower: string | null;
};

const cache = new Map<string, TalkProfileSearchFields>();

export function getTalkProfileCache(
  peerThreadId: string,
): TalkProfileSearchFields | undefined {
  return cache.get(peerThreadId);
}

export function setTalkProfileCache(
  peerThreadId: string,
  fields: TalkProfileSearchFields,
): void {
  cache.set(peerThreadId, fields);
}
