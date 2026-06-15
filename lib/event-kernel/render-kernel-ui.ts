import type {

  EventKernelState,

  KernelCommitDecision,

} from "@/lib/event-kernel/types";

import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";



/** Execution wire — §1 input. Values are read-only at render time. */

export type KernelUiExecutionInput = {

  readonly frame: {

    readonly entities: readonly string[];

    readonly intent_hint: string;

    readonly modifiers: readonly string[];

  };

  readonly decision: KernelCommitDecision;

  readonly result: { readonly summary: string } | null;

  readonly actions: ReadonlyArray<{ readonly id: string; readonly label: string }>;

  readonly response_hint: string;

};



/** @deprecated Use KernelUiExecutionInput */

export type KernelUiRenderInput = KernelUiExecutionInput;



export type KernelUiBlockKind = "direct" | "options" | "clarify";



export type KernelUiActionCard = {

  id: string;

  label: string;

};



/** Presentation model — derived display only; source input unchanged. */

export type KernelUiRenderModel = {

  kind: KernelUiBlockKind;

  sectionLabel: string;

  coreMessage: string;

  nextActionLabel: string | null;

  actionCards: KernelUiActionCard[];

  decision: KernelCommitDecision;

};



const CORE_LABEL = "🧠 핵심";

const OPTIONS_LABEL = "👉 선택하세요";

const CLARIFY_LABEL = "👉 하나만 물어보기";

const NEXT_ACTION_LABEL = "👉 다음 행동";



function truncateDisplayLines(text: string, maxLines: number): string {

  const trimmed = text.trim();

  if (!trimmed) {

    return "";

  }

  return trimmed.split("\n").slice(0, maxLines).join("\n");

}



function mapActionCards(

  actions: KernelUiExecutionInput["actions"],

  limit: number

): KernelUiActionCard[] {

  return actions.slice(0, limit).map((action) => ({

    id: action.id,

    label: action.label.trim(),

  }));

}



function resolveCoreMessage(input: KernelUiExecutionInput): string {

  const fromHint = truncateDisplayLines(input.response_hint, 2);

  if (fromHint) {

    return fromHint;

  }

  if (input.result?.summary) {

    return truncateDisplayLines(input.result.summary, 2);

  }

  return "";

}



/**

 * Event Kernel UI Renderer — presentation only (§1–§7).

 * Does NOT modify input values.

 */

export function renderKernelUi(input: KernelUiExecutionInput): KernelUiRenderModel {

  switch (input.decision) {

    case "OPTIONS": {

      const actionCards = mapActionCards(input.actions, 3);

      return {

        kind: "options",

        sectionLabel: OPTIONS_LABEL,

        coreMessage: "",

        nextActionLabel: null,

        actionCards,

        decision: input.decision,

      };

    }



    case "CLARIFY": {

      return {

        kind: "clarify",

        sectionLabel: CLARIFY_LABEL,

        coreMessage: resolveCoreMessage(input),

        nextActionLabel: null,

        actionCards: [],

        decision: input.decision,

      };

    }



    case "DIRECT_ACTION":

    default: {

      const actionCards = mapActionCards(input.actions, 1);

      return {

        kind: "direct",

        sectionLabel: CORE_LABEL,

        coreMessage: resolveCoreMessage(input),

        nextActionLabel: actionCards.length > 0 ? NEXT_ACTION_LABEL : null,

        actionCards,

        decision: input.decision,

      };

    }

  }

}



export function buildKernelUiRenderInput(

  kernel: EventKernelState,

  responseHint: string = kernel.responseHint,

  resultSummary?: string

): KernelUiExecutionInput {

  return {

    frame: {

      entities: kernel.frame.entities,

      intent_hint: kernel.frame.intent_hint,

      modifiers: kernel.frame.modifiers,

    },

    decision: kernel.committedDecision,

    result: resultSummary?.trim() ? { summary: resultSummary.trim() } : null,

    actions: kernel.actions.map((action) => ({

      id: action.id,

      label: action.label,

    })),

    response_hint: responseHint,

  };

}



export function renderKernelUiFromInput(

  kernel: EventKernelState,

  responseHint?: string,

  resultSummary?: string

): KernelUiRenderModel {

  return renderKernelUi(

    buildKernelUiRenderInput(kernel, responseHint, resultSummary)

  );

}



export function isKernelUiMessage(message: ActionChatMessage): boolean {

  return Boolean(message.meta?.kernel_decision && message.meta?.kernel_ui);

}



export function renderKernelUiFromMessage(

  message: ActionChatMessage

): KernelUiRenderModel | null {

  const input = message.meta?.kernel_ui;

  if (!input) {

    return null;

  }

  return renderKernelUi(input);

}


