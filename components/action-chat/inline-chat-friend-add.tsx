"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FriendAddContactFlow } from "@/components/peer-chat/friend-add-contact-flow";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import { notifyPeerRoomFromFeed } from "@/lib/peer-chat/navigate-peer-room-from-feed";
import { cn } from "@/lib/utils";

type InlineChatFriendAddProps = {
  contact: string;
  className?: string;
};

export function InlineChatFriendAdd({ contact, className }: InlineChatFriendAddProps) {
  const router = useRouter();

  return (
    <FriendAddContactFlow
      contact={contact}
      className={cn(className)}
      onAdded={(result) => {
        addPeerContact({
          peerThreadId: result.threadId,
          displayName: result.displayName,
          rimvioId: result.rimvioId,
          emailLower: result.emailLower,
        });
        emitFeedSlotsRefresh();
        toast.success(`${result.displayName}님을 친구로 추가했어요`);
        notifyPeerRoomFromFeed(result.displayName);
        router.push(`/peers/${encodeURIComponent(result.threadId)}`);
      }}
      onError={(message) => toast.error(message)}
    />
  );
}
