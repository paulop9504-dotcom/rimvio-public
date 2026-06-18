import type { LinkCommentRow } from "@/lib/rooms/types";

export type RoomLeader = {
  label: string;
  clears: number;
};

/** Most "done" clears in the room — crown / MVP badge. */
export function computeRoomLeader(comments: LinkCommentRow[]): RoomLeader | null {
  const counts = new Map<string, number>();

  for (const comment of comments) {
    if (comment.kind !== "done") {
      continue;
    }

    const label = comment.author_label.trim();
    if (!label) {
      continue;
    }

    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  let leader: RoomLeader | null = null;

  for (const [label, clears] of counts) {
    if (!leader || clears > leader.clears) {
      leader = { label, clears };
    }
  }

  return leader;
}
