"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { syncMyProfileFromAuth } from "@/lib/peer-chat/peer-chat-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** 로그인 직후 피드만 써도 이메일 프로필이 생기게 (ROOM 방문 불필요). */
export function RimvioAuthProfileBootstrap() {
  const { user, configured } = useAuth();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!configured || !user?.id || !isSupabaseConfigured()) {
      return;
    }
    if (syncedFor.current === user.id) {
      return;
    }
    syncedFor.current = user.id;
    void syncMyProfileFromAuth().catch(() => {});
  }, [configured, user?.id]);

  return null;
}
