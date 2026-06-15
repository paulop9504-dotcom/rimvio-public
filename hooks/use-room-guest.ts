"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getRoomGuest,
  ROOM_GUEST_UPDATED,
  SSR_PENDING_GUEST,
  type RoomGuest,
} from "@/lib/rooms/guest-session";

export function useRoomGuest(): RoomGuest {
  const [guest, setGuest] = useState<RoomGuest>(SSR_PENDING_GUEST);

  const sync = useCallback(() => {
    setGuest(getRoomGuest());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(ROOM_GUEST_UPDATED, sync);
    return () => window.removeEventListener(ROOM_GUEST_UPDATED, sync);
  }, [sync]);

  return guest;
}
