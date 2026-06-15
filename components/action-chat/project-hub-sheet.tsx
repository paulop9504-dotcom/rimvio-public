"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ActionChatContextTabs } from "@/components/action-chat/context-tabs";
import type { FixedContainerSlot } from "@/components/action-chat/fixed-container-bar";
import { formatAxisLastActive } from "@/lib/home/derive-today-axis";
import { getContainerById } from "@/lib/container-store/containers-store";
import { listEventsForContainer } from "@/lib/container-store/events-store";
import { listStreamRecordsForContainer } from "@/lib/data-architect/persist-stream-record";
import { getRecentKnowledgeEntities } from "@/lib/knowledge/knowledge-entity-db";
import { FIXED_DATA_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type HubTab = "stream" | "knowledge" | "decisions" | "actions" | "captures";

type ProjectHubSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerId: string | null;
  links: LinkRow[];
  activeIndex: number;
  onSelectLinkIndex: (index: number) => void;
  scheduledLinkIds?: Set<string>;
  onScheduleLink?: (linkId: string) => void;
  containerHoverSlot?: FixedContainerSlot | null;
  onSnapToContainer?: (slot: FixedContainerSlot, linkId: string) => void;
  actionLabels?: string[];
};

const TABS: Array<{ id: HubTab; label: string }> = [
  { id: "stream", label: "스트림" },
  { id: "knowledge", label: "지식" },
  { id: "decisions", label: "결정" },
  { id: "actions", label: "액션" },
  { id: "captures", label: "캡처" },
];

export function ProjectHubSheet({
  open,
  onOpenChange,
  containerId,
  links,
  activeIndex,
  onSelectLinkIndex,
  scheduledLinkIds = new Set<string>(),
  onScheduleLink,
  containerHoverSlot = null,
  onSnapToContainer,
  actionLabels = [],
}: ProjectHubSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<HubTab>("stream");
  const [poolLinkIds, setPoolLinkIds] = useState<Set<string>>(new Set());

  const container = containerId ? getContainerById(containerId) : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !containerId) {
      return;
    }
    void (async () => {
      const entities = await getRecentKnowledgeEntities({
        containerId: FIXED_DATA_CONTAINER_ID,
        limit: 200,
      });
      const ids = new Set(
        entities
          .filter((entity) => entity.topicContainerId === containerId && entity.sourceLinkId)
          .map((entity) => entity.sourceLinkId!)
      );
      setPoolLinkIds(ids);
    })();
  }, [open, containerId]);

  const hubLinks = useMemo(
    () => links.filter((link) => poolLinkIds.has(link.id)),
    [links, poolLinkIds]
  );

  const streamItems = containerId ? listStreamRecordsForContainer(containerId, 20) : [];
  const knowledgeItems = container?.knowledge ?? [];
  const decisionEvents = containerId
    ? listEventsForContainer(containerId, 30).filter((event) => event.type === "orchestrator_result")
    : [];

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && containerId && container ? (
        <>
          <motion.button
            type="button"
            aria-label="?�기"
            className="fixed inset-0 z-[80] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label={`${container.title} ?�브`}
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(88vh,720px)] max-w-lg flex-col rounded-t-[24px] border border-black/5 bg-rimvio-surface shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  Project Hub
                </p>
                <h2 className="truncate text-[18px] font-bold text-[#1F2937]">{container.title}</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {formatAxisLastActive(container.last_active_at)}
                </p>
              </div>
              <button
                type="button"
                aria-label="?�기"
                onClick={() => onOpenChange(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-black/[0.04] px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                    tab === entry.id
                      ? "bg-[#1F2937] text-white"
                      : "bg-black/[0.04] text-muted-foreground"
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3">
              {tab === "stream" ? (
                <ul className="space-y-2">
                  {streamItems.length === 0 ? (
                    <li className="text-[13px] text-muted-foreground">아직 스트림 기록이 없어요</li>
                  ) : (
                    streamItems.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl border border-border bg-[#F9FAFB] px-3 py-2 text-[13px] leading-relaxed text-[#374151]"
                      >
                        {item.text}
                      </li>
                    ))
                  )}
                </ul>
              ) : null}

              {tab === "knowledge" ? (
                <ul className="space-y-2">
                  {[...knowledgeItems].map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-border bg-[#F9FAFB] px-3 py-2"
                    >
                      <p className="text-[12px] font-medium text-muted-foreground">{item.label}</p>
                      <p className="mt-0.5 truncate text-[13px] text-[#1F2937]">{item.value}</p>
                    </li>
                  ))}
                  {knowledgeItems.length === 0 ? (
                    <li className="text-[13px] text-muted-foreground">저장된 지식이 없어요</li>
                  ) : null}
                </ul>
              ) : null}

              {tab === "decisions" ? (
                <ul className="space-y-2">
                  {decisionEvents.length === 0 ? (
                    <li className="text-[13px] text-muted-foreground">최근 결정 기록이 없어요</li>
                  ) : (
                    decisionEvents.map((event) => (
                      <li
                        key={event.id}
                        className="rounded-xl border border-border bg-[#F9FAFB] px-3 py-2 text-[13px] text-[#374151]"
                      >
                        {String(event.data.summary ?? event.data.message ?? "결정 기록")}
                      </li>
                    ))
                  )}
                </ul>
              ) : null}

              {tab === "actions" ? (
                <ul className="space-y-2">
                  {actionLabels.length === 0 ? (
                    <li className="text-[13px] text-muted-foreground">예약된 액션이 없어요</li>
                  ) : (
                    actionLabels.map((label, index) => (
                      <li
                        key={`${label}-${index}`}
                        className="rounded-xl border border-border bg-[#F9FAFB] px-3 py-2 text-[13px] text-[#374151]"
                      >
                        {label}
                      </li>
                    ))
                  )}
                </ul>
              ) : null}

              {tab === "captures" ? (
                hubLinks.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">이 프로젝트에 연결된 캡처가 없어요</p>
                ) : (
                  <ActionChatContextTabs
                    links={hubLinks}
                    activeIndex={Math.max(
                      0,
                      hubLinks.findIndex((link) => link.id === links[activeIndex]?.id)
                    )}
                    onSelect={(index) => {
                      const link = hubLinks[index];
                      const globalIndex = links.findIndex((entry) => entry.id === link?.id);
                      if (globalIndex >= 0) {
                        onSelectLinkIndex(globalIndex);
                      }
                    }}
                    scheduledLinkIds={scheduledLinkIds}
                    onScheduleLink={onScheduleLink}
                    containerHoverSlot={containerHoverSlot}
                    onSnapToContainer={onSnapToContainer}
                    className="px-0"
                  />
                )
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
