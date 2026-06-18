"use client";

import type { PeerMessage } from "@/lib/context/peer-message-types";
import { cn } from "@/lib/utils";

export type ExperienceDiscussionMessageProps = {
  message: PeerMessage;
  speakerName: string;
  className?: string;
};

/** Experience ROOM row — no bubble, no read receipt. */
export function ExperienceDiscussionMessage({
  message,
  speakerName,
  className,
}: ExperienceDiscussionMessageProps) {
  const body = message.body.trim();
  if (!body) {
    return null;
  }

  return (
    <li
      className={cn("border-b border-border px-3 py-3 last:border-b-0", className)}
      data-experience-discussion-message={message.id}
    >
      <p className="text-[13px] font-semibold text-foreground">{speakerName}</p>
      <p className="mt-0.5 text-[14px] leading-snug text-foreground/85">
        &ldquo;{body}&rdquo;
      </p>
    </li>
  );
}
