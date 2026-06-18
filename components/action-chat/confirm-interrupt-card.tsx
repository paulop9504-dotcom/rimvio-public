"use client";

import { RimvioActionButton } from "@/components/ui/rimvio-action-button";

type ConfirmInterruptCardProps = {
  userMessage: string;
  onResume: () => void;
  onCancel: () => void;
};

export function ConfirmInterruptCard({
  userMessage,
  onResume,
  onCancel,
}: ConfirmInterruptCardProps) {
  return (
    <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-3">
      <p className="text-[12px] leading-relaxed text-amber-900/90">
        장소 확인 중이에요. 먼저 마무리할까요, 아니면 다른 질문에 답할까요?
      </p>
      <p className="text-[11px] text-amber-800/70">입력: “{userMessage.slice(0, 48)}”</p>
      <div className="grid grid-cols-2 gap-2">
        <RimvioActionButton variant="primary" onClick={onResume}>
          작업 마무리
        </RimvioActionButton>
        <RimvioActionButton variant="secondary" onClick={onCancel}>
          다른 질문에 답하기
        </RimvioActionButton>
      </div>
    </div>
  );
}
