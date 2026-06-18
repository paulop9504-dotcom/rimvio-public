"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  Check,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { deleteMediaBlob } from "@/lib/location-ping/media-blob-store";
import { deleteMediaSpacetimeContext } from "@/lib/location-ping/media-context-store";
import { readMediaBlobUrl } from "@/lib/location-ping/media-blob-store";
import {
  GLOBE_CONTEXT_MEDIA_ACCEPT,
  isGlobeContextIngestMediaFile,
} from "@/lib/feed/ingest-globe-context-media";
import {
  formatMediaPoolExpiryLabel,
  formatMediaPoolPlaceLabel,
  formatMediaPoolTimeLabel,
  mediaPoolStartIsoFromContext,
} from "@/lib/media-pool/format-media-pool-labels";
import type { MediaPoolItem } from "@/lib/media-pool/list-media-pool-items";
import { listMediaPoolItems } from "@/lib/media-pool/list-media-pool-items";
import { stageMediaToPoolBulk } from "@/lib/media-pool/stage-media-to-pool";
import { cn } from "@/lib/utils";

export type GlobeMediaPoolTriggerProps = {
  count: number;
  onOpen: () => void;
  className?: string;
};

export function GlobeMediaPoolTrigger({
  count,
  onOpen,
  className,
}: GlobeMediaPoolTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm ring-1 ring-border backdrop-blur-md active:scale-[0.98]",
        className,
      )}
      aria-label={
        count > 0
          ? `${copy.globe.mediaPoolTriggerAria} · ${count}개`
          : copy.globe.mediaPoolTriggerAria
      }
      data-globe-media-pool-trigger
    >
      <ImagePlus className="size-4 text-primary" aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 py-px text-[10px] font-bold leading-none text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}

export type GlobeMediaPoolSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateContext: (input: {
    contextIds: string[];
    startIso: string;
  }) => void;
  onAttachToActive?: (contextIds: string[]) => void;
  activeContextTitle?: string | null;
};

function PoolTile({
  item,
  selected,
  onToggle,
  onDelete,
}: {
  item: MediaPoolItem;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readMediaBlobUrl(item.id).then((next) => {
      if (!cancelled) {
        setUrl(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const expiry = formatMediaPoolExpiryLabel(item.expiresAtIso);

  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border">
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-0 z-[1]"
        aria-label={selected ? "선택 해제" : "선택"}
      />
      {url ? (
        item.mediaKind === "video" ? (
          <video
            src={url}
            className="size-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        )
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 text-left">
        <p className="text-[11px] font-medium text-white">
          {formatMediaPoolTimeLabel(item)}
        </p>
        <p className="truncate text-[10px] text-white/80">
          {formatMediaPoolPlaceLabel(item)}
        </p>
        {expiry ? (
          <p className="text-[10px] text-white/60">{expiry}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "absolute left-2 top-2 z-[2] flex size-6 items-center justify-center rounded-full border-2",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-white/80 bg-black/30 text-transparent",
        )}
      >
        <Check className="size-3.5" aria-hidden />
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="absolute right-2 top-2 z-[2] flex size-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
        aria-label="삭제"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
      {item.mediaKind === "video" ? (
        <span className="pointer-events-none absolute right-2 bottom-2 z-[2] rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          동영상
        </span>
      ) : null}
    </div>
  );
}

/** Staged GPS-less photos/videos — pick items and create a globe context. */
export function GlobeMediaPoolSheet({
  open,
  onOpenChange,
  onCreateContext,
  onAttachToActive,
  activeContextTitle,
}: GlobeMediaPoolSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<MediaPoolItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listMediaPoolItems();
      setItems(rows);
      setSelected((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          if (rows.some((row) => row.id === id)) {
            next.add(id);
          }
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    void refresh();
  }, [open, refresh]);

  const selectedIds = useMemo(
    () => items.filter((row) => selected.has(row.id)).map((row) => row.id),
    [items, selected],
  );

  const suggestedStartIso = useMemo(() => {
    const first = items.find((row) => selected.has(row.id));
    return first ? mediaPoolStartIsoFromContext(first) : "";
  }, [items, selected]);

  const handleCreate = useCallback(() => {
    if (selectedIds.length === 0) {
      toast.info(copy.globe.mediaPoolSelectHint);
      return;
    }
    onCreateContext({
      contextIds: selectedIds,
      startIso: suggestedStartIso,
    });
    onOpenChange(false);
  }, [onCreateContext, onOpenChange, selectedIds, suggestedStartIso]);

  const handleAttachActive = useCallback(() => {
    if (selectedIds.length === 0 || !onAttachToActive) {
      return;
    }
    onAttachToActive(selectedIds);
    onOpenChange(false);
  }, [onAttachToActive, onOpenChange, selectedIds]);

  const handleDelete = useCallback(
    async (contextId: string) => {
      await deleteMediaBlob(contextId);
      await deleteMediaSpacetimeContext(contextId);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(contextId);
        return next;
      });
      await refresh();
      toast.success(copy.globe.mediaPoolDeletedToast);
    },
    [refresh],
  );

  const handleAddFiles = useCallback(
    async (fileList: FileList | null | undefined) => {
      if (!fileList?.length || busy) {
        return;
      }
      const files = Array.from(fileList).filter(isGlobeContextIngestMediaFile);
      if (files.length === 0) {
        return;
      }
      setBusy(true);
      const toastId = toast.loading(copy.globe.mediaPoolAddingToast);
      try {
        const summary = await stageMediaToPoolBulk({ files });
        toast.success(summary.toastLine, { id: toastId });
        await refresh();
      } catch {
        toast.error(copy.globe.mediaPoolAddFailToast, { id: toastId });
      } finally {
        setBusy(false);
        if (fileRef.current) {
          fileRef.current.value = "";
        }
      }
    },
    [busy, refresh],
  );

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]"
            aria-label="닫기"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.globe.mediaPoolTitle}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col rounded-t-3xl bg-card shadow-xl ring-1 ring-border"
            data-globe-media-pool-sheet
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div>
                <h2 className="text-[17px] font-semibold text-foreground">
                  {copy.globe.mediaPoolTitle}
                </h2>
                <p className="text-[12px] text-muted-foreground">
                  {copy.globe.mediaPoolSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground"
                aria-label="닫기"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" aria-hidden />
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[15px] font-medium text-foreground">
                    {copy.globe.mediaPoolEmptyTitle}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {copy.globe.mediaPoolEmptyBody}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {items.map((item) => (
                    <PoolTile
                      key={item.id}
                      item={item}
                      selected={selected.has(item.id)}
                      onToggle={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) {
                            next.delete(item.id);
                          } else {
                            next.add(item.id);
                          }
                          return next;
                        });
                      }}
                      onDelete={() => void handleDelete(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-3 text-[14px] font-medium text-foreground"
                >
                  <ImagePlus className="size-4 text-primary" aria-hidden />
                  {copy.globe.mediaPoolAddButton}
                </button>
                {activeContextTitle && onAttachToActive ? (
                  <button
                    type="button"
                    disabled={selectedIds.length === 0 || busy}
                    onClick={handleAttachActive}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-3 text-[14px] font-medium text-secondary-foreground disabled:opacity-40"
                  >
                    {activeContextTitle}에 붙이기
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={selectedIds.length === 0 || busy}
                  onClick={handleCreate}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-3 text-[14px] font-semibold text-primary-foreground disabled:opacity-40"
                >
                  <CalendarPlus className="size-4" aria-hidden />
                  {copy.globe.mediaPoolCreateButton(selectedIds.length)}
                </button>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={GLOBE_CONTEXT_MEDIA_ACCEPT}
              multiple
              className="hidden"
              onChange={(event) => void handleAddFiles(event.target.files)}
            />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
