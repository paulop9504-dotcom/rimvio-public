"use client";

import { FileText, Link2, X } from "lucide-react";
import type {
  ComposerAttachment,
  ComposerAttachmentWire,
} from "@/lib/action-chat/composer-attachments";
import { cn } from "@/lib/utils";

type ComposerAttachmentStripProps = {
  attachments: Array<ComposerAttachment | ComposerAttachmentWire>;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
  className?: string;
};

export function ComposerAttachmentStrip({
  attachments,
  onRemove,
  readOnly = false,
  className,
}: ComposerAttachmentStripProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", className)}>
      {attachments.map((item) => (
        <div
          key={item.id}
          className="group relative shrink-0 overflow-hidden rounded-xl border border-border bg-rimvio-surface shadow-sm"
        >
          {item.kind === "image" && item.previewUrl ? (
            <img
              src={item.previewUrl}
              alt={item.label}
              className="size-16 object-cover"
            />
          ) : (
            <div className="flex size-16 flex-col items-center justify-center gap-1 bg-[#F3F4F6] px-2">
              {item.kind === "link" ? (
                <Link2 className="size-5 text-[#4A90E2]" />
              ) : (
                <FileText className="size-5 text-muted-foreground" />
              )}
              <span className="max-w-[56px] truncate text-[9px] font-medium text-[#374151]">
                {item.label}
              </span>
            </div>
          )}
          {!readOnly && onRemove ? (
            <button
              type="button"
              aria-label="첨�? ?�거"
              onClick={() => onRemove(item.id)}
              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/55 text-white opacity-90"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
