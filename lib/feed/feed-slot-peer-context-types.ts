export type FeedSlotPeerContextSource =
  | "feed_talk"
  | "surface_people"
  | "name_match"
  | "plan_metadata";

/** Who the appointment is with — shown on feed slot cards. */
export type FeedSlotPeerContext = {
  peerThreadId: string;
  displayName: string;
  avatarUrl: string | null;
  rimvioId: string | null;
  emailLower: string | null;
  source: FeedSlotPeerContextSource;
};

export type FeedSlotPeerLookupRow = {
  peerThreadId: string;
  displayName: string;
  avatarUrl?: string | null;
  rimvioId?: string | null;
  emailLower?: string | null;
};

export type FeedSlotPeerLookup = {
  /** Chat log — links calendar messageId → @톡 thread. */
  messages: readonly { id: string; feedPeerTalkThread?: { peerThreadId: string; displayName: string } | null }[];
  /** Friends with avatars (relationship feed slots). */
  peers: readonly FeedSlotPeerLookupRow[];
};
