"use client";

import { useRouter } from "next/navigation";
import { CalendarBoard } from "@/components/action-chat/calendar-board";
import { CalendarGoogleConnectBanner } from "@/components/calendar/calendar-google-connect-banner";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { useActionCalendar } from "@/hooks/use-action-calendar";
import { useFeedSlotChatMessages } from "@/hooks/use-feed-slot-chat-messages";

export function CalendarPageClient() {
  const router = useRouter();
  const messages = useFeedSlotChatMessages();
  const { overlayRows } = useActionCalendar({
    messages,
    linkIds: [],
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
      <CalendarToolbar variant="page" className="mb-3" />

      {overlayRows.length === 0 ? (
        <CalendarGoogleConnectBanner className="mb-3" />
      ) : null}

      <CalendarBoard
        variant="full"
        defaultView="month"
        overlayRows={overlayRows}
        className="min-h-0 flex-1 rounded-2xl"
        hideOriginLegend
        showEmptyActions
        onAddSchedule={() => router.push("/search")}
        onSpawnPrompt={(uri) => router.push(`/search?q=${encodeURIComponent(uri)}`)}
      />
    </div>
  );
}
