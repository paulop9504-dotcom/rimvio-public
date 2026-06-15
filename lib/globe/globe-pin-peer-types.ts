/** Who shared this experience — shown on globe pin cards. */
export type GlobePinPeer = {
  peerThreadId: string;
  displayName: string;
  avatarUrl: string | null;
};

export type GlobePinPeerSeed = {
  displayName: string;
  peerThreadId?: string | null;
};
