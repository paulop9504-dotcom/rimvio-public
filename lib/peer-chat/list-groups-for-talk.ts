import { readGroupThreadsCache } from "@/lib/peer-chat/group-threads-cache";
import type { GroupTalkTarget } from "@/lib/peer-chat/group-talk-target-types";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";

const MAX_LIST = 24;

/** Cached 단톡 ROOM 목록 — syncDmThreadsRemote / 방 생성 시 갱신. */
export function listGroupsForTalk(): GroupTalkTarget[] {
  return readGroupThreadsCache()
    .filter((row) => isGroupThreadId(row.peerThreadId))
    .slice(0, MAX_LIST);
}
