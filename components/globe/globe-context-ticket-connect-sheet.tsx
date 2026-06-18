"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  buildDefaultTicketArtifactFromEvent,
  saveContextTicketArtifact,
} from "@/lib/globe/context-hub/save-context-ticket-artifact";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextTicketConnectSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextEventId: string | null;
  onSaved?: (event: EventCandidate) => void;
};

async function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("image_read_failed"));
    reader.readAsDataURL(file);
  });
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso?.trim()) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 16);
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

/** Manual ticket / QR plug-in — use time becomes Resource spacetime for MAIN rank. */
export function GlobeContextTicketConnectSheet({
  open,
  onOpenChange,
  contextEventId,
  onSaved,
}: GlobeContextTicketConnectSheetProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [labelKo, setLabelKo] = useState("티켓");
  const [placeLabel, setPlaceLabel] = useState("");
  const [validFromLocal, setValidFromLocal] = useState("");
  const [validUntilLocal, setValidUntilLocal] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [qrFileName, setQrFileName] = useState<string | null>(null);

  const event = useMemo(() => {
    const eventId = contextEventId?.trim();
    if (!eventId) {
      return null;
    }
    return findLifeEventCandidate(eventId);
  }, [contextEventId]);

  const resetForm = useCallback(() => {
    if (!event) {
      setLabelKo("티켓");
      setPlaceLabel("");
      setValidFromLocal("");
      setValidUntilLocal("");
      setActionUrl("");
      setQrPreviewUrl(null);
      setQrFileName(null);
      return;
    }
    const defaults = buildDefaultTicketArtifactFromEvent(event);
    setLabelKo(defaults.labelKo ?? "티켓");
    setPlaceLabel(defaults.placeLabel ?? "");
    setValidFromLocal(toDatetimeLocalValue(defaults.validFromIso));
    setValidUntilLocal(toDatetimeLocalValue(defaults.validUntilIso));
    setActionUrl("");
    setQrPreviewUrl(null);
    setQrFileName(null);
  }, [event]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    resetForm();
  }, [open, resetForm]);

  const handlePickImage = useCallback(async (file: File | null) => {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(copy.globe.ticketConnectImageOnly);
      return;
    }
    try {
      const dataUrl = await readImageAsDataUrl(file);
      setQrPreviewUrl(dataUrl);
      setQrFileName(file.name);
    } catch {
      toast.error(copy.globe.ticketConnectFail);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const eventId = contextEventId?.trim();
    if (!eventId || busy) {
      return;
    }
    const trimmedUrl = actionUrl.trim();
    const qr = qrPreviewUrl?.trim() || null;
    if (!trimmedUrl && !qr) {
      toast.error(copy.globe.ticketConnectNeedQrOrUrl);
      return;
    }

    setBusy(true);
    try {
      const saved = saveContextTicketArtifact({
        contextEventId: eventId,
        artifact: {
          labelKo: labelKo.trim() || "티켓",
          actionUrl: trimmedUrl || null,
          qrPreviewUrl: qr,
          validFromIso: datetimeLocalToIso(validFromLocal),
          validUntilIso: datetimeLocalToIso(validUntilLocal),
          placeLabel: placeLabel.trim() || null,
        },
      });
      toast.success(copy.globe.ticketConnectSuccess);
      onSaved?.(saved);
      onOpenChange(false);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : copy.globe.ticketConnectFail,
      );
    } finally {
      setBusy(false);
    }
  }, [
    actionUrl,
    busy,
    contextEventId,
    labelKo,
    onOpenChange,
    onSaved,
    placeLabel,
    qrPreviewUrl,
    validFromLocal,
    validUntilLocal,
  ]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex flex-col justify-end bg-black/40"
          onClick={() => !busy && onOpenChange(false)}
          data-globe-ticket-connect-sheet
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[min(92vh,40rem)] overflow-hidden rounded-t-[1.75rem] border border-border/60 bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-border/50 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Ticket className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    id={titleId}
                    className="text-[16px] font-semibold leading-tight text-foreground"
                  >
                    {copy.globe.ticketConnectTitle}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {copy.globe.ticketConnectBody}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full active:bg-muted"
                  aria-label={copy.globe.ticketQrViewerClose}
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                    {copy.globe.ticketConnectLabel}
                  </span>
                  <input
                    value={labelKo}
                    onChange={(event) => setLabelKo(event.target.value)}
                    placeholder={copy.globe.ticketConnectLabelPlaceholder}
                    className={cn(
                      "w-full rounded-2xl border border-border bg-muted/50 px-4 py-3",
                      "text-[15px] text-foreground outline-none ring-primary/30 focus:ring-2",
                    )}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                    {copy.globe.ticketConnectPlace}
                  </span>
                  <input
                    value={placeLabel}
                    onChange={(event) => setPlaceLabel(event.target.value)}
                    placeholder={copy.globe.ticketConnectPlacePlaceholder}
                    className={cn(
                      "w-full rounded-2xl border border-border bg-muted/50 px-4 py-3",
                      "text-[15px] text-foreground outline-none ring-primary/30 focus:ring-2",
                    )}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                      {copy.globe.ticketConnectUseAt}
                    </span>
                    <input
                      type="datetime-local"
                      value={validFromLocal}
                      onChange={(event) => setValidFromLocal(event.target.value)}
                      className={cn(
                        "w-full rounded-2xl border border-border bg-muted/50 px-3 py-3",
                        "text-[14px] text-foreground outline-none ring-primary/30 focus:ring-2",
                      )}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                      {copy.globe.ticketConnectUntil}
                    </span>
                    <input
                      type="datetime-local"
                      value={validUntilLocal}
                      onChange={(event) => setValidUntilLocal(event.target.value)}
                      className={cn(
                        "w-full rounded-2xl border border-border bg-muted/50 px-3 py-3",
                        "text-[14px] text-foreground outline-none ring-primary/30 focus:ring-2",
                      )}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                    {copy.globe.ticketConnectQrPick}
                  </span>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border",
                      "bg-muted/30 px-4 py-3 active:bg-muted/50",
                    )}
                  >
                    <ImagePlus className="size-5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 text-[13px] text-foreground">
                      {qrFileName ?? copy.globe.ticketConnectQrPickHint}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        void handlePickImage(event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {qrPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrPreviewUrl}
                      alt=""
                      className="mt-2 max-h-28 rounded-xl border border-border/60 object-contain"
                    />
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
                    {copy.globe.ticketConnectUrlOptional}
                  </span>
                  <input
                    value={actionUrl}
                    onChange={(event) => setActionUrl(event.target.value)}
                    placeholder="https://"
                    inputMode="url"
                    className={cn(
                      "w-full rounded-2xl border border-border bg-muted/50 px-4 py-3",
                      "text-[15px] text-foreground outline-none ring-primary/30 focus:ring-2",
                    )}
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-border/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-[15px] font-semibold text-primary-foreground active:opacity-90 disabled:opacity-60"
                data-globe-ticket-connect-save
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {copy.globe.ticketConnectSave}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
