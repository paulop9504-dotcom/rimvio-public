"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Users, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { InboxFilter } from "@/components/inbox-filter";
import { InboxLinkInput } from "@/components/inbox-link-input";
import { InboxCoachingStrip } from "@/components/inbox-coaching-strip";
import { InboxLinkRow } from "@/components/inbox-link-row";
import { RimvioLogo } from "@/components/rimvio-logo";
import { RoomPickerSheet } from "@/components/room-picker-sheet";
import { useRealtimeLinks } from "@/hooks/use-realtime-links";
import { useCopy } from "@/hooks/use-copy";
import { IOS } from "@/lib/ui/ios-surface";
import {
  normalizeLinkCategory,
  type InboxFilterValue,
} from "@/lib/categories/types";
import { sortByOpenLoopPressure } from "@/lib/behavior/zeigarnik";
import { isLinkOpen } from "@/lib/behavior/completion";
import { runBulkSystemShare } from "@/lib/share/bulk-beam-share";
import { openHrefWithFallback } from "@/lib/actions/open-with-fallback";
import { setPinnedUrl } from "@/lib/local-links/pinned-link";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

const INBOX_INPUT_SCROLL_THRESHOLD = 12;

function InboxPasteHeader({
  visible,
  autoPaste,
}: {
  visible: boolean;
  autoPaste: boolean;
}) {
  const copy = useCopy();

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.header
          key="inbox-paste-header"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="inbox-golden-input w-full min-w-0 shrink-0 overflow-hidden bg-rimvio-surface-muted"
        >
          <p className="mb-2 px-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            {copy.inbox.paste}
          </p>
          <InboxLinkInput autoPaste={autoPaste} />
          <p className="mt-2 px-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {copy.inbox.hintInteraction}
          </p>
        </motion.header>
      ) : null}
    </AnimatePresence>
  );
}

function countByCategory(links: { category: string | null }[]) {
  const counts: Partial<Record<InboxFilterValue, number>> = { all: links.length };

  for (const link of links) {
    const category = normalizeLinkCategory(link.category);
    counts[category] = (counts[category] ?? 0) + 1;
  }

  return counts;
}

export function ActionFeedList() {
  return (
    <Suspense fallback={<div className="h-12 animate-pulse rounded-2xl bg-muted/40" />}>
      <ActionFeedListInner />
    </Suspense>
  );
}

function ActionFeedListInner() {
  const copy = useCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoPaste = searchParams.get("paste") === "1";
  const { activeLinks, archivedLinks } = useRealtimeLinks();
  const [filter, setFilter] = useState<InboxFilterValue>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [bulkLinks, setBulkLinks] = useState<LinkRow[]>([]);
  const [inputVisible, setInputVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const archivedCount = archivedLinks.length;

  const onInboxScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    setInputVisible(node.scrollTop <= INBOX_INPUT_SCROLL_THRESHOLD);
  }, []);

  const counts = useMemo(
    () => countByCategory(activeLinks.filter(isLinkOpen)),
    [activeLinks]
  );

  const filteredLinks = useMemo(() => {
    const open = activeLinks.filter(isLinkOpen);

    const scoped =
      filter === "all"
        ? open
        : open.filter(
            (link) => normalizeLinkCategory(link.category) === filter
          );

    return sortByOpenLoopPressure(scoped);
  }, [activeLinks, filter]);

  const selectedLinks = useMemo(
    () => filteredLinks.filter((link) => selectedIds.has(link.id)),
    [filteredLinks, selectedIds]
  );

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredLinks.map((link) => link.id)));
  }, [filteredLinks]);

  const sendLinks = useCallback(async (links: LinkRow[]) => {
    if (!links.length) {
      return;
    }

    const { shared, copiedText } = await runBulkSystemShare(links);

    if (shared) {
      toast.success(copy.inbox.bulkShared(links.length));
      exitSelectMode();
      return;
    }

    if (copiedText) {
      toast.success(copy.inbox.bulkCopied);
      exitSelectMode();
      return;
    }

    toast.error(copy.share.retry);
  }, [exitSelectMode]);

  const openRoomPicker = useCallback((links: LinkRow[]) => {
    if (!links.length) {
      return;
    }

    setBulkLinks(links);
    setRoomPickerOpen(true);
  }, []);

  const enterSelectWith = useCallback((link: LinkRow) => {
    setSelectMode(true);
    setSelectedIds(new Set([link.id]));
  }, []);

  const openSelectedLinks = useCallback((links: LinkRow[]) => {
    if (!links.length) {
      return;
    }

    const href =
      links[0].actions.find((action) => action.kind === "open" && action.href)
        ?.href ?? links[0].original_url;

    if (href.startsWith("/")) {
      router.push(href);
      return;
    }

    openHrefWithFallback(href, links[0].original_url);
  }, [router]);

  const moveSelectedToFeed = useCallback(
    (links: LinkRow[]) => {
      if (!links.length) {
        return;
      }

      setPinnedUrl(links[0].original_url);
      router.push("/");
    },
    [router]
  );

  const inputHeader = (
    <InboxPasteHeader visible={inputVisible} autoPaste={autoPaste} />
  );

  if (activeLinks.length === 0) {
    return (
      <div className="inbox-page-shell">
        {inputHeader}
        <div
          ref={scrollRef}
          onScroll={onInboxScroll}
          className="inbox-page-scroll"
        >
          <InboxEmptyState archivedCount={archivedCount} />
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-page-shell">
      {inputHeader}

      <div
        ref={scrollRef}
        onScroll={onInboxScroll}
        className="inbox-page-scroll"
      >
        <section className="inbox-golden-command w-full min-w-0 gap-[var(--space-u)] pt-1">
        <div className="w-full min-w-0">
          <div className="mb-[var(--space-u)] flex items-center justify-between px-0.5">
            {selectMode ? (
              <>
                <span className="text-xs font-medium text-foreground">
                  {copy.inbox.selectedCount(selectedLinks.length)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-xs font-medium text-rimvio-neon-cyan"
                  >
                    {copy.inbox.selectAll}
                  </button>
                  <button
                    type="button"
                    onClick={exitSelectMode}
                    className="text-xs text-muted-foreground"
                  >
                    {copy.inbox.cancelSelect}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                  {copy.inbox.savedLabel}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectMode(true)}
                    className="text-xs font-medium text-rimvio-neon-cyan"
                  >
                    {copy.inbox.select}
                  </button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {filteredLinks.length}�?                  </span>
                </div>
              </>
            )}
          </div>
          <InboxFilter
            compact
            value={filter}
            onChange={setFilter}
            counts={counts}
          />
          <div className="mt-[var(--space-u)]">
            <InboxCoachingStrip links={activeLinks.filter(isLinkOpen)} />
          </div>
          {selectMode && selectedLinks.length === 0 ? (
            <p className="mt-2 rounded-xl bg-rimvio-neon-purple/8 px-3 py-2 text-center text-xs text-rimvio-neon-cyan">
              {copy.inbox.selectPrompt}
            </p>
          ) : null}
          {!selectMode && filteredLinks.length > 1 ? (
            <button
              type="button"
              onClick={() => void sendLinks(filteredLinks)}
              className={cn(
                "mt-[var(--space-u)] flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5",
                "bg-rimvio-neon-purple/10 text-sm font-medium text-rimvio-neon-cyan",
                "transition-colors active:bg-rimvio-neon-purple/15"
              )}
            >
              <Send className="size-4" strokeWidth={2} />
              {copy.inbox.sendFiltered(filteredLinks.length)}
            </button>
          ) : null}
        </div>
      </section>

      <section className="inbox-golden-body w-full min-w-0">
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredLinks.length === 0 ? (
            <motion.div
              key="empty-filter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 items-center justify-center px-[var(--space-phi2)] py-[var(--space-phi3)] text-center"
            >
              <p className="text-sm text-muted-foreground">
                {copy.inbox.emptyCategory}
              </p>
            </motion.div>
          ) : (
            <div className="inbox-golden-scroll w-full min-w-0">
              <motion.div
                key="list"
                layout
                className={cn("w-full min-w-0 overflow-hidden", IOS.cardSm)}
              >
                {filteredLinks.map((link, index) => (
                  <motion.div
                    key={link.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={
                      index < filteredLinks.length - 1
                        ? "border-b border-border"
                        : undefined
                    }
                  >
                    <InboxLinkRow
                      link={link}
                      selectable={selectMode}
                      selected={selectedIds.has(link.id)}
                      onToggleSelect={() => toggleSelect(link.id)}
                      onEnterSelectMode={enterSelectWith}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {archivedCount > 0 ? (
                <ArchiveHint count={archivedCount} />
              ) : null}
            </div>
          )}
        </AnimatePresence>
        </section>
      </div>

      {selectMode && selectedLinks.length > 0 ? (
        <div
          className={cn(
            "shrink-0 border-t border-border bg-background/95 px-[var(--space-phi)] py-3 backdrop-blur-md",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          )}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openSelectedLinks(selectedLinks)}
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold active:bg-muted/40"
            >
              <ExternalLink className="size-4" />
              {copy.inbox.openSelected}
            </button>
            <button
              type="button"
              onClick={() => moveSelectedToFeed(selectedLinks)}
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold active:bg-muted/40"
            >
              <Sparkles className="size-4" />
              {copy.inbox.moveToFeed}
            </button>
            <button
              type="button"
              onClick={() => void sendLinks(selectedLinks)}
              className="flex items-center justify-center gap-2 rounded-full bg-rimvio-neon-purple py-3 text-sm font-semibold text-white active:opacity-90"
            >
              <Send className="size-4" />
              {copy.inbox.sendBulk(selectedLinks.length)}
            </button>
            <button
              type="button"
              onClick={() => openRoomPicker(selectedLinks)}
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold active:bg-muted/40"
            >
              <Users className="size-4" />
              {copy.inbox.sendToRoom}
            </button>
          </div>
        </div>
      ) : null}

      <RoomPickerSheet
        links={bulkLinks}
        open={roomPickerOpen}
        onOpenChange={(open) => {
          setRoomPickerOpen(open);
          if (!open) {
            setBulkLinks([]);
            exitSelectMode();
          }
        }}
      />
    </div>
  );
}
function InboxEmptyState({ archivedCount }: { archivedCount: number }) {
  const copy = useCopy();

  return (
    <div className="inbox-golden-empty">
      <RimvioLogo size="lg" framed className="mb-1" />
      <p className="mt-[var(--space-phi)] text-sm font-medium">
        {copy.inbox.emptyTitle}
      </p>
      <p className="mt-[var(--space-u)] max-w-[15rem] text-xs leading-relaxed text-muted-foreground">
        {copy.inbox.emptyHint}
      </p>
      {archivedCount > 0 ? (
        <Link
          href="/archive"
          className="mt-[var(--space-phi2)] text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {copy.inbox.archiveLink(archivedCount)}
        </Link>
      ) : null}
    </div>
  );
}

function ArchiveHint({ count }: { count: number }) {
  const copy = useCopy();

  return (
    <div className="py-[var(--space-phi)] text-center">
      <Link
        href="/archive"
        className="text-xs text-muted-foreground/75 transition-colors hover:text-muted-foreground"
      >
        {copy.inbox.archiveLink(count)}
      </Link>
    </div>
  );
}
