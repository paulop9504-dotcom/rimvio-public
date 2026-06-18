/** Unlimited 1:1 friend contacts (separate from AI pin slots). */

export type PeerContact = {
  peerThreadId: string;
  displayName: string;
  /** @톡 검색 · 버블 표시 */
  rimvioId?: string | null;
  emailLower?: string | null;
  /** 서버 프로필 이름 (ROOM 라벨과 다를 수 있음) */
  profileDisplayName?: string | null;
  /** ROOM 슬롯에 적어 둔 이름 */
  roomDisplayName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PeerContactBook = {
  contacts: PeerContact[];
};
