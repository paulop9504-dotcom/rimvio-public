"use client";

import { ArrowRight, ClipboardPaste, Link2, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  useRef,
  useState,
  useEffect,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { ingestPastedLinks, type InboxPasteResult } from "@/lib/share/inbox-paste";
import { parseAllManualLinkInputs } from "@/lib/share/parse-share-payload";
import { IOS } from "@/lib/ui/ios-surface";
import { cn } from "@/lib/utils";

export function InboxLinkInput({
  className,
  autoPaste = false,
  autoFocusOnMount = false,
  requestClipboard = false,
  onClipboardRequested,
  onSaved,
}: {
  className?: string;
  autoPaste?: boolean;
  autoFocusOnMount?: boolean;
  requestClipboard?: boolean;
  onClipboardRequested?: () => void;
  onSaved?: (result: InboxPasteResult) => void;
}) {
  const copy = useCopy();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const autoPasteDoneRef = useRef(false);

  useEffect(() => {
    if (autoFocusOnMount) {
      inputRef.current?.focus();
    }
  }, [autoFocusOnMount]);

  useEffect(() => {
    if (!requestClipboard) {
      return;
    }

    onClipboardRequested?.();

    const run = async () => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
        inputRef.current?.focus();
        return;
      }

      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (text) {
          setValue(text);
        }
        inputRef.current?.focus();
      } catch {
        inputRef.current?.focus();
      }
    };

    void run();
  }, [requestClipboard, onClipboardRequested]);

  useEffect(() => {
    if (!autoPaste || autoPasteDoneRef.current) {
      return;
    }

    autoPasteDoneRef.current = true;

    if (searchParams.get("paste") !== "1") {
      inputRef.current?.focus();
      return;
    }

    const run = async () => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
        inputRef.current?.focus();
        return;
      }

      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (text) {
          setValue(text);
        }
        inputRef.current?.focus();
      } catch {
        inputRef.current?.focus();
      }
    };

    void run();
  }, [autoPaste, searchParams]);

  const submitRaw = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      toast.error(copy.inbox.paste);
      inputRef.current?.focus();
      return false;
    }

    const preview = parseAllManualLinkInputs(trimmed);
    if (preview.length === 0) {
      toast.error(copy.inbox.invalidFormat);
      inputRef.current?.focus();
      return false;
    }

    setBusy(true);

    try {
      const result = await ingestPastedLinks(trimmed);

      if (result.added === 0) {
        toast.message(
          result.skipped > 0 ? copy.inbox.alreadyExists : copy.inbox.invalidFormat
        );
        return false;
      }

      setValue("");
      toast.success(
        result.added > 1
          ? copy.inbox.multiSaved(result.added)
          : copy.feed.newLinkSaved
      );
      onSaved?.(result);
      return true;
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) {
      return;
    }
    void submitRaw(value);
  };

  const handlePaste = async () => {
    if (busy) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
      toast.error(copy.inbox.clipboardUnsupported);
      inputRef.current?.focus();
      return;
    }

    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        toast.error(copy.inbox.clipboardEmpty);
        return;
      }

      setValue(text);
      await submitRaw(text);
    } catch {
      toast.error(copy.inbox.clipboardPermission);
      inputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full min-w-0", className)}>
      <div
        className={cn(
          IOS.cardSm,
          "flex w-full min-w-0 items-center gap-2 px-3 py-2.5",
          "transition-shadow focus-within:ring-2 focus-within:ring-[#007AFF]/25"
        )}
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-rimvio-neon-purple/10 text-rimvio-neon-cyan"
          aria-hidden
        >
          <Link2 className="size-[1.125rem]" strokeWidth={2.1} />
        </span>

        <div className="min-w-0 flex-1">
          <textarea
            ref={inputRef}
            id="inbox-link"
            rows={value.includes("\n") ? 3 : 1}
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={copy.inbox.pastePlaceholder}
            value={value}
            disabled={busy}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!busy && value.trim()) {
                  void submitRaw(value);
                }
              }
            }}
            className={cn(
              "block w-full min-w-0 resize-none bg-transparent",
              "text-[17px] leading-[1.35] tracking-tight text-foreground",
              "overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "placeholder:text-muted-foreground/55",
              "focus-visible:outline-none disabled:opacity-60"
            )}
          />
          {!value.trim() ? (
            <p className="mt-0.5 text-[12px] leading-none text-muted-foreground/55">
              {copy.inbox.pasteSubhint}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 self-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handlePaste()}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full",
              "bg-rimvio-surface-muted text-muted-foreground transition-colors",
              "active:bg-[#e8e8ed] disabled:opacity-40"
            )}
            aria-label={copy.inbox.paste}
          >
            <ClipboardPaste className="size-[1.05rem]" strokeWidth={1.85} />
          </button>
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full",
              "bg-rimvio-neon-purple text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.55)]",
              "transition-all disabled:pointer-events-none disabled:bg-rimvio-neon-purple/25 disabled:shadow-none",
              "active:scale-[0.96]"
            )}
            aria-label={copy.actions.openLink}
          >
            {busy ? (
              <Loader2 className="size-[1.05rem] animate-spin" />
            ) : (
              <ArrowRight className="size-[1.05rem]" strokeWidth={2.25} />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
