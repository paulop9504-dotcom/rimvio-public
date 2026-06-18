import { listGroupsForTalk } from "@/lib/peer-chat/list-groups-for-talk";
import type { GroupTalkTarget } from "@/lib/peer-chat/group-talk-target-types";

const MAX_RESULTS = 12;

export function filterGroupsForTalk(query: string): GroupTalkTarget[] {
  const groups = listGroupsForTalk();
  const q = query.trim().toLowerCase();
  if (!q) {
    return groups.slice(0, MAX_RESULTS);
  }

  const filtered = groups.filter((row) =>
    row.displayName.trim().toLowerCase().includes(q),
  );

  filtered.sort((a, b) => {
    const an = a.displayName.trim().toLowerCase();
    const bn = b.displayName.trim().toLowerCase();
    const aStarts = an.startsWith(q) ? 0 : 1;
    const bStarts = bn.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) {
      return aStarts - bStarts;
    }
    return an.localeCompare(bn, "ko");
  });

  return filtered.slice(0, MAX_RESULTS);
}
