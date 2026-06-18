"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ImagePlus,
  Loader2,
  Plus,
  SendHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  GLOBE_CONTEXT_MEDIA_ACCEPT,
  ingestGlobeContextFromFiles,
  ingestGlobeContextFromText,
} from "@/lib/feed/ingest-globe-context-capture";
import { runGlobeComposerAction } from "@/lib/globe/run-globe-composer-action";
import {
  rimvioComposerFieldClass,
  rimvioIconBtnClass,
  rimvioNavBarClass,
} from "@/lib/brand/rimvio-neon-theme";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/human-ko";

export type GlobeContextIngestBarHandle = {
  openPhotoPicker: () => void;
};

export type GlobeContextIngestBarProps = {
  className?: string;
  /** Active pin sheet — photos attach here instead of auto-match. */
  targetEventId?: string | null;
  targetTitle?: string | null;
  forceAttachToTarget?: boolean;
  onAttached?: (eventId: string) => void;
};

/** Globe home — photos, videos, links, memos auto-attach to stored contexts. */
export const GlobeContextIngestBar = forwardRef<
  GlobeContextIngestBarHandle,
  GlobeContextIngestBarProps
>(function GlobeContextIngestBar(
  {
    className,
    targetEventId,
    targetTitle,
    forceAttachToTarget = false,
    onAttached,
  },
  ref,
) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openPhotoPicker: () => {
      setMenuOpen(true);
      window.setTimeout(() => photoRef.current?.click(), 0);
    },
  }));

  const finish = useCallback(
    (eventId: string, line: string) => {
      toast.success(line);
      onAttached?.(eventId);
      setText("");
      setMenuOpen(false);
    },
    [onAttached],
  );

  const attachHintId = forceAttachToTarget ? targetEventId?.trim() || null : null;
  const attachHintTitle = forceAttachToTarget ? targetTitle?.trim() || null : null;
  const inputPlaceholder =
    attachHintTitle
      ? `「${attachHintTitle}」에 @ · 사진 · 메모`
      : "@길찾기 역이름 · 사진 · 링크 · 메모 — 갤러리 여러 장도 위치·시간 자동";

  const ingestMedia = useCallback(
    async (fileList: FileList | null | undefined) => {
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
          hintEventId: attachHintId,
          hintTitle: attachHintTitle,
          forceAttachToHint: forceAttachToTarget && Boolean(attachHintId),
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
        if (summary.lastEventId) {
          onAttached?.(summary.lastEventId);
        }
        setText("");
        setMenuOpen(false);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "사진·동영상을 넣지 못했어요.";
        toast.error(message, { id: toastId });
      } finally {
        setBusy(false);
        if (photoRef.current) {
          photoRef.current.value = "";
        }
      }
    },
    [attachHintId, attachHintTitle, busy, forceAttachToTarget, onAttached],
  );

  const submitText = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      const value = text.trim();
      if (!value || busy) {
        return;
      }
      setBusy(true);
      try {
        const action = runGlobeComposerAction(value);
        if (action) {
          window.location.assign(action.url);
          toast.success(`${action.label} 여는 중…`);
          setText("");
          setMenuOpen(false);
          return;
        }
        const outcome = ingestGlobeContextFromText(value);
        finish(outcome.result.event.id, outcome.toastLine);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "맥락에 붙이지 못했어요.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, finish, text],
  );

  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-x-0 z-30 px-3",
        "bottom-[var(--rimvio-bottom-nav-offset)]",
        "lg:bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
      data-globe-context-ingest-bar
    >
      <form
        onSubmit={(event) => void submitText(event)}
        className={cn(
          rimvioNavBarClass,
          "rimvio-globe-ingest-bar mx-auto flex max-w-lg items-center gap-2 rounded-2xl px-2 py-2 shadow-lg ring-1 ring-border/80",
        )}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            rimvioIconBtnClass("ghost"),
            "size-10 shrink-0 rounded-xl",
          )}
          aria-label={menuOpen ? "닫기" : "추가"}
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Plus className="size-5" aria-hidden />
          )}
        </button>

        <div className={cn(rimvioComposerFieldClass, "min-w-0 flex-1 px-3 py-2")}>
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={inputPlaceholder}
            disabled={busy}
            className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            data-globe-context-ingest-input
          />
        </div>

        <button
          type="submit"
          disabled={busy || !text.trim()}
          className={cn(
            rimvioIconBtnClass("primary"),
            "size-10 shrink-0 rounded-xl disabled:opacity-40",
          )}
          aria-label="보내기"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <SendHorizontal className="size-5" aria-hidden />
          )}
        </button>
      </form>

      {menuOpen ? (
        <div className="mx-auto mt-2 flex max-w-lg justify-start gap-2 px-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => photoRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-2 text-[13px] font-medium text-foreground shadow-sm ring-1 ring-border"
          >
            <ImagePlus className="size-4 text-primary" aria-hidden />
            사진·동영상 · EXIF 위치 자동 · GPS 없으면 보관함
          </button>
        </div>
      ) : null}

      <input
        ref={photoRef}
        type="file"
        accept={GLOBE_CONTEXT_MEDIA_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => void ingestMedia(event.target.files)}
      />
    </div>
  );
});
