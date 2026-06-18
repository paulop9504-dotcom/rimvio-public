"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRealtimeLinksOptional } from "@/hooks/use-realtime-links";
import { RIMVIO } from "@/lib/brand/rimvio";
import { copy } from "@/lib/copy/human-ko";
import {
  exportLocalLinksJson,
  importLocalLinks,
  readLocalLinks,
} from "@/lib/local-links/store";
import { cn } from "@/lib/utils";

type FeedSyncPanelProps = {
  className?: string;
};

export function FeedSyncPanel({ className }: FeedSyncPanelProps) {
  const realtime = useRealtimeLinksOptional();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    const source = realtime?.links ?? readLocalLinks();
    const json = exportLocalLinksJson(source);
    const filename = `rimvio-feed-${new Date().toISOString().slice(0, 10)}.json`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        const file = new File([json], filename, { type: "application/json" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `${RIMVIO.name} 내 링크 백업`,
            files: [file],
          });
          toast.success(copy.sync.exportShared);
          return;
        }
      }
    } catch {
      // Fall through.
    }

    try {
      await navigator.clipboard.writeText(json);
      toast.success(copy.sync.exportCopied);
    } catch {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(copy.sync.exportDownload);
    }
  };

  const handleImportFile = async (file: File) => {
    setBusy(true);
    try {
      const raw = await file.text();
      const count = realtime
        ? realtime.importFeedLinks(raw)
        : importLocalLinks(raw).length;

      toast.success(copy.sync.importOk(count));

      if (!realtime) {
        window.location.reload();
      }
    } catch {
      toast.error(copy.sync.importFail, {
        description: copy.sync.importFailHint,
      });
    } finally {
      setBusy(false);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/50 bg-card/50 p-4",
        className
      )}
    >
      <h2 className="text-sm font-semibold">{copy.sync.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {copy.sync.hint}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleExport()}
          className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
        >
          {copy.sync.export}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold"
        >
          {copy.sync.import}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleImportFile(file);
            }
          }}
        />
      </div>
    </section>
  );
}
