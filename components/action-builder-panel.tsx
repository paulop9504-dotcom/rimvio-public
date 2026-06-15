"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import {
  createUserDefinedActionDraft,
  deleteUserDefinedAction,
  readUserDefinedActions,
  upsertUserDefinedAction,
  USER_DEFINED_ACTIONS_UPDATED,
} from "@/lib/actions/user-defined-action-store";
import type { UserDefinedAction } from "@/lib/actions/user-defined-action-types";
import { cn } from "@/lib/utils";

type ActionBuilderPanelProps = {
  className?: string;
};

export function ActionBuilderPanel({ className }: ActionBuilderPanelProps) {
  const [actions, setActions] = useState<UserDefinedAction[]>([]);
  const [name, setName] = useState("비트코인 숏 매수");
  const [triggers, setTriggers] = useState("숏 매수해, 숏 걸어, 비트코인 숏");
  const [urlTemplate, setUrlTemplate] = useState(
    "exchange-app://trade?pair=BTC-USDT&side=short&action=open&amount={amount}"
  );
  const [params, setParams] = useState("amount:금액");

  const reload = () => setActions(readUserDefinedActions());

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener(USER_DEFINED_ACTIONS_UPDATED, onUpdate);
    return () => window.removeEventListener(USER_DEFINED_ACTIONS_UPDATED, onUpdate);
  }, []);

  const saveAction = () => {
    const parsedParams = params
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const [key, label] = chunk.split(":").map((part) => part.trim());
        return { key: key || "amount", label: label || key || "값" };
      });

    const draft = createUserDefinedActionDraft({
      name,
      triggers: triggers.split(",").map((item) => item.trim()),
      urlTemplate,
      params: parsedParams,
    });

    upsertUserDefinedAction(draft);
    reload();
  };

  return (
    <section className={cn("rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05]", className)}>
      <div className="mb-4 flex items-center gap-2">
        <Zap className="size-5 text-[#7B61FF]" />
        <div>
          <h2 className="text-[15px] font-semibold text-[#111827]">액션 빌더</h2>
          <p className="text-[12px] text-[#6B7280]">
            한마디로 내 앱·API 화면을 바로 엽니다. URL에 {"{amount}"} 같은 매개변수를 넣으세요.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-[12px] font-medium text-[#374151]">이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px]"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[12px] font-medium text-[#374151]">트리거 (쉼표로 구분)</span>
          <input
            value={triggers}
            onChange={(event) => setTriggers(event.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px]"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[12px] font-medium text-[#374151]">액션 URL</span>
          <input
            value={urlTemplate}
            onChange={(event) => setUrlTemplate(event.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] font-mono"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[12px] font-medium text-[#374151]">매개변수 (key:라벨)</span>
          <input
            value={params}
            onChange={(event) => setParams(event.target.value)}
            placeholder="amount:금액"
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px]"
          />
        </label>

        <button
          type="button"
          onClick={saveAction}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#7B61FF] px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          <Plus className="size-4" />
          액션 저장
        </button>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-[12px] font-semibold text-[#374151]">저장된 액션</p>
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-start justify-between gap-3 rounded-xl bg-[#F9FAFB] px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#111827]">{action.name}</p>
              <p className="truncate text-[11px] text-[#6B7280]">{action.triggers.join(" · ")}</p>
              <p className="truncate font-mono text-[10px] text-[#9CA3AF]">{action.urlTemplate}</p>
            </div>
            <button
              type="button"
              aria-label="삭제"
              onClick={() => deleteUserDefinedAction(action.id)}
              className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-white hover:text-[#EF4444]"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
