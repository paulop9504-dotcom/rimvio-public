"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  GLOBE_CONTEXT_MEDIA_ACCEPT,
  ingestGlobeContextFromFiles,
} from "@/lib/feed/ingest-globe-context-capture";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/human-ko";

export type GlobeContextPhotoButtonProps = {
  eventId: string;
  eventTitle: string;
  variant?: "primary" | "secondary";
  className?: string;
  onIngested?: () => void;
};

/** Add photo/video to a globe context — attach or split by spacetime. */
export function GlobeContextPhotoButton({
  eventId,
  eventTitle,
  variant = "secondary",
  className,
  onIngested,
}: GlobeContextPhotoButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || busy) {
      return;
    }
    const files = Array.from(fileList);
    setBusy(true);
    const toastId = toast.loading(
      files.length === 1
        ? "올리는 중…"
        : `사진·동영상 ${files.length}개 올리는 중… 0/${files.length}`,
    );
    try {
      const summary = await ingestGlobeContextFromFiles(files, {
        hintEventId: eventId,
        hintTitle: eventTitle,
        forceAttachToHint: true,
        onProgress: (done, total) => {
          if (total > 1) {
            toast.loading(`사진·동영상 ${total}개 올리는 중… ${done}/${total}`, {
              id: toastId,
            });
          }
        },
        onFilePrepare: (line) => {
          toast.loading(line, { id: toastId });
        },
      });
      if (summary.succeeded === 0) {
        toast.error(summary.toastLine, { id: toastId });
        return;
      }
      const suggestedPlace = summary.lastSuggestedPlaceName?.trim();
      if (suggestedPlace) {
        toast.success(copy.globe.inboxPhotoPlaceSuggestToast(suggestedPlace), {
          id: toastId,
        });
      } else {
        toast.success(summary.toastLine, { id: toastId });
      }
      onIngested?.();
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "사진·동영상을 넣지 못했어요.";
      toast.error(message, { id: toastId });
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const primary = variant === "primary";

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold transition active:opacity-90 disabled:opacity-50",
          primary
            ? "bg-foreground text-background"
            : "border border-border bg-card text-foreground",
          className,
        )}
        data-globe-context-photo-button
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <ImagePlus className="size-4" aria-hidden />
        )}
        사진·동영상 넣기
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={GLOBE_CONTEXT_MEDIA_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => void onFiles(event.target.files)}
      />
    </>
  );
}
