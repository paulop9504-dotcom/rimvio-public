/** Where a feed slot card tap should navigate. */
export type FeedSlotOpenTarget =
  | {
      kind: "peer_room";
      peerThreadId: string;
      displayName?: string;
    }
  | {
      kind: "feed_message";
      messageId: string;
    }
  | {
      kind: "calendar";
    };
