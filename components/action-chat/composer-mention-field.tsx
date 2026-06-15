"use client";

import {
  useMemo,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { segmentComposerMentions } from "@/lib/action-chat/composer-mention-highlight";
import { cn } from "@/lib/utils";

type ComposerMentionFieldProps = {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
  fieldClassName?: string;
};

function MentionMirror({ value }: { value: string }) {
  const segments = useMemo(() => segmentComposerMentions(value), [value]);

  if (!value) {
    return null;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === "mention-valid") {
          return (
            <span key={`${index}-${segment.text}`} className="rimvio-composer-mention-valid">
              {segment.text}
            </span>
          );
        }
        return <span key={`${index}-${segment.text}`}>{segment.text}</span>;
      })}
    </>
  );
}

export function ComposerMentionField({
  value,
  placeholder,
  disabled = false,
  inputRef,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  fieldClassName,
}: ComposerMentionFieldProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? localRef;

  const syncScroll = () => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) {
      return;
    }
    mirror.scrollTop = textarea.scrollTop;
    mirror.scrollLeft = textarea.scrollLeft;
  };

  const focusTextarea = () => {
    if (!disabled) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  };

  return (
    <div
      className={cn("rimvio-composer-mention-wrap relative min-w-0 flex-1", className)}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          focusTextarea();
        }
      }}
    >
      <div
        ref={mirrorRef}
        aria-hidden
        className="rimvio-composer-mention-mirror rimvio-composer-mention-layer pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap"
      >
        <MentionMirror value={value} />
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        rows={1}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        onPointerDown={(event) => event.stopPropagation()}
        inputMode="text"
        enterKeyHint="send"
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        className={cn(
          "rimvio-composer-textarea--mirror rimvio-composer-mention-layer max-h-24 min-h-[1.25rem] w-full resize-none border-0 bg-transparent p-0 focus:outline-none touch-manipulation",
          fieldClassName,
        )}
      />
    </div>
  );
}
