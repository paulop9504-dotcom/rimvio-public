"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { joinPeerThreadByInviteRemote } from "@/lib/peer-chat/peer-chat-client";
import { upsertGroupThreadCache } from "@/lib/peer-chat/group-threads-cache";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import { useAuth } from "@/hooks/use-auth";

export function PeerJoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, configured } = useAuth();
  const [busy, setBusy] = useState(false);
  const code = searchParams.get("code")?.trim() ?? "";

  useEffect(() => {
    if (loading || !code || !configured || !user || busy) {
      return;
    }

    setBusy(true);
    void joinPeerThreadByInviteRemote(code)
      .then((result) => {
        const label = result.displayName?.trim() || "단톡";
        if (result.roomKind === "group") {
          upsertGroupThreadCache({
            peerThreadId: result.threadId,
            displayName: label,
          });
        } else {
          addPeerContact({
            peerThreadId: result.threadId,
            displayName: label,
          });
        }
        toast.success(`${label} 대화방에 들어왔어요`);
        router.replace(`/peers/${encodeURIComponent(result.threadId)}`);
      })
      .catch((error) => {
        toast.error("초대 링크가 올바르지 않아요", {
          description:
            error instanceof Error ? error.message : undefined,
        });
        router.replace("/peers");
      });
  }, [loading, code, configured, user, busy, router]);

  if (!code) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-muted-foreground">초대 코드가 없어요</p>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        로그인 확인 중…
      </p>
    );
  }

  return (
    <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      대화방 연결 중…
    </p>
  );
}
