import type { LinkRow } from "@/types/database";
import type { RoomLiveEvent, RoomServerState } from "@/lib/rooms/types";

function linkTitle(links: LinkRow[], linkId: string) {
  return links.find((link) => link.id === linkId)?.title ?? "할 일";
}

export function diffRoomActivity(
  previous: RoomServerState | null,
  next: RoomServerState,
  selfLabel: string
): RoomLiveEvent[] {
  if (!previous) {
    return [];
  }

  const events: RoomLiveEvent[] = [];
  const prevCommentIds = new Set(previous.comments.map((comment) => comment.id));

  for (const comment of next.comments) {
    if (prevCommentIds.has(comment.id)) {
      continue;
    }

    if (comment.author_label === selfLabel) {
      continue;
    }

    if (comment.kind === "done") {
      events.push({
        kind: "done",
        linkTitle: linkTitle(next.links, comment.link_id),
        authorLabel: comment.author_label,
      });
      continue;
    }

    events.push({
      kind: "comment",
      comment,
      linkTitle: linkTitle(next.links, comment.link_id),
    });
  }

  const prevLinks = new Map(previous.links.map((link) => [link.id, link]));

  for (const link of next.links) {
    const before = prevLinks.get(link.id);

    if (!before) {
      events.push({ kind: "link_added", linkTitle: link.title });
    }
  }

  return events;
}

export function roomLiveToast(event: RoomLiveEvent) {
  if (event.kind === "done") {
    return {
      title: `${event.authorLabel}님이 미션 클리어했어요`,
      description: `${event.linkTitle} — 끝!`,
    };
  }

  if (event.kind === "link_added") {
    return {
      title: "새로 들어왔어요",
      description: event.linkTitle,
    };
  }

  const { comment, linkTitle: title } = event;

  if (comment.kind === "coupon") {
    return {
      title: `${comment.author_label}님이 쿠폰 남겼어요`,
      description: title ? `${title} · ${comment.message}` : comment.message,
    };
  }

  if (comment.kind === "note") {
    return {
      title: `${comment.author_label}님이 메모 남겼어요`,
      description: comment.message,
    };
  }

  return {
    title: `${comment.author_label}님`,
    description: comment.message,
  };
}
