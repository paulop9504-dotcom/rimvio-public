"use client";

import { Loader2 } from "lucide-react";
import { HitRunFeedbackBar } from "@/components/action-chat/hit-run-feedback-bar";
import { TikiChoiceChips } from "@/components/action-chat/tiki-choice-chips";
import type { TikiChoiceOption } from "@/lib/action-chat/parse-tiki-choice-options";
import { parseTikiChoiceBlock } from "@/lib/action-chat/parse-tiki-choice-options";
import type { HitRunFeedbackVerdict } from "@/lib/action-chat/hit-run-feedback/types";
import { useMemo } from "react";

type AssistantBubbleBodyProps = {
  text: string;
  loading?: boolean;
  tikiChoices?: TikiChoiceOption[];
  simplifyMode?: boolean;
  suppressChips?: boolean;
  hitRunFeedback?: HitRunFeedbackVerdict | null;
  onTikiChoice?: (reply: string) => void;
  onHitRunFeedback?: (verdict: HitRunFeedbackVerdict) => void;
};

function renderPlainText(text: string) {
  return <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{text}</div>;
}

export function AssistantBubbleBody({
  text,
  loading = false,
  tikiChoices,
  simplifyMode = false,
  suppressChips = false,
  hitRunFeedback = null,
  onTikiChoice,
  onHitRunFeedback,
}: AssistantBubbleBodyProps) {
  const parsed = useMemo(() => parseTikiChoiceBlock(text), [text]);
  const choices = tikiChoices?.length ? tikiChoices : parsed.choices;
  const showChips =
    !simplifyMode &&
    !suppressChips &&
    parsed.hasChoices &&
    choices.length >= 2 &&
    Boolean(onTikiChoice);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-[#4A90E2]" />
        {renderPlainText(text)}
      </span>
    );
  }

  return (
    <div>
      {showChips ? (
        <>
          {parsed.intro ? renderPlainText(parsed.intro) : null}
          <TikiChoiceChips
            choices={choices}
            disabled={loading}
            onSelect={(reply) => onTikiChoice?.(reply)}
          />
          {parsed.closing ? (
            <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">
              {parsed.closing}
            </div>
          ) : null}
        </>
      ) : (
        renderPlainText(text)
      )}

      {onHitRunFeedback ? (
        <HitRunFeedbackBar
          value={hitRunFeedback}
          disabled={loading}
          onVote={onHitRunFeedback}
        />
      ) : null}
    </div>
  );
}
