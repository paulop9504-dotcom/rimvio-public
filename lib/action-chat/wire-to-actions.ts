import { isCustomSchemeHref } from "@/lib/actions/open-with-fallback";
import { createCallAction, createOpenAction } from "@/lib/enrichers/action-factory";
import { isTelHref } from "@/lib/enrichers/extract-phone";

import type { LinkActionItem } from "@/types/database";

import type {

  MasterOrchestratorWire,

  OrchestratorActionWire,

} from "@/lib/action-chat/orchestrator-types";
import type { OrchestratorConfirmationWire, BatchPendingItem, WittyButtonWire } from "@/lib/action-chat/confirmation-types";
import { sanitizePlaceNameForNavigation } from "@/lib/action-chat/resolve-navigation-place";

import {

  EMPTY_CONTAINER_WIRE,

  EMPTY_SCHEDULE_WIRE,

} from "@/lib/action-chat/orchestrator-types";

import {
  globalBrainActionableToMasterWire,
  parseGlobalBrainActionableWire,
} from "@/lib/global-brain/global-brain-actionable-output";
import { dockUpdateToMasterWire } from "@/lib/action-os/dock-update-to-master-wire";
import { actionIntentToMasterWire } from "@/lib/action-dispatcher/action-intent-to-master-wire";
import { parseActionIntentWire } from "@/lib/action-dispatcher/parse-action-intent-wire";
import {
  parseDockUpdateWire,
  parseRegisterActionWire,
} from "@/lib/action-os/parse-action-os-wire";
import { commitRegisterAction } from "@/lib/action-os/custom-trigger-store";
import { REGISTER_ACTION_CONFIRM_MESSAGE } from "@/lib/action-os/types";
import {
  actionArchitectToMasterWire,
  parseActionArchitectWire,
} from "@/lib/action-registry/parse-action-architect";



const ICON_MAP: Record<string, string> = {

  "map-pin": "map",

  map: "map",

  navigation: "map",

  globe: "link",

  check: "link",

  phone: "phone",

  star: "link",

  "shopping-cart": "link",

  search: "link",

  link: "link",

  calendar: "link",

  share: "share",

};



function payloadIcon(icon?: string) {

  if (!icon?.trim()) {

    return "link";

  }

  return ICON_MAP[icon.trim().toLowerCase()] ?? "link";

}



export function wireActionsToLinkItems(

  actions: OrchestratorActionWire[]

): LinkActionItem[] {

  return actions

    .filter((action) => typeof action.url === "string" && action.url.trim())

    .slice(0, 4)

    .map((action, index) => {
      const label = action.label?.trim() || "열기";
      const url = action.url.trim();

      if (/^rimvio:\/\/global-brain\//i.test(url)) {
        const code = decodeURIComponent(
          url.replace(/^rimvio:\/\/global-brain\//i, "").split("?")[0] ?? ""
        );
        return {
          id: `global-brain-${index}`,
          label,
          kind: "custom" as const,
          payload: {
            globalBrainActionCode: code,
            globalBrainActionPrompt: label,
            orchestratorIndex: index,
          },
        };
      }

      if (isTelHref(url)) {
        const phone = url.replace(/^tel(?:prompt)?:/i, "");
        const call = createCallAction(phone, label);
        return {
          ...call,
          payload: {
            ...call.payload,
            orchestratorIndex: index,
            icon: payloadIcon(action.icon),
          },
        };
      }

      if (action.action_type === "DEEP_LINK" || action.action_type === "DEEP_LINK_DISPATCH") {
        const open = createOpenAction({
          label,
          href: url,
          icon: payloadIcon(action.icon),
          copyText: url,
          payload: {
            orchestratorIndex: index,
            deepLinkDispatch: true,
            dispatchStatus: "READY_TO_EXECUTE",
          },
        });
        return open;
      }

      const isDeepScheme = isCustomSchemeHref(url) && !/^tel:|^sms:|^mailto:/i.test(url);
      return createOpenAction({
        label,
        href: url,
        icon: payloadIcon(action.icon),
        copyText: url,
        payload: {
          orchestratorIndex: index,
          ...(isDeepScheme ? { deepLinkDispatch: true, dispatchStatus: "READY_TO_EXECUTE" } : {}),
        },
      });
    });

}



function normalizeMetadata(raw: MasterOrchestratorWire["metadata"]) {

  const intent = raw?.intent;

  const validIntent =

    intent === "ACTION" || intent === "SCHEDULE" || intent === "CONTAINER_MGMT"

      ? intent

      : "ACTION";



  const adj = raw?.trust_level_adjustment;

  const validAdj =

    adj === "INCREASE" || adj === "DECREASE" || adj === "NONE" ? adj : "NONE";



  return { intent: validIntent, trust_level_adjustment: validAdj };

}



function normalizeSchedule(raw: MasterOrchestratorWire["schedule"]) {

  if (!raw) {

    return EMPTY_SCHEDULE_WIRE;

  }



  return {

    is_conflict: Boolean(raw.is_conflict),

    message: typeof raw.message === "string" ? raw.message : "",

    tasks: Array.isArray(raw.tasks)

      ? raw.tasks

          .filter((task) => task && typeof task.time === "string")

          .map((task) => ({

            time: task.time,

            task: typeof task.task === "string" ? task.task : "일정",

          }))

      : [],

  };

}



function normalizeContainer(raw: MasterOrchestratorWire["container"]) {

  if (!raw) {

    return EMPTY_CONTAINER_WIRE;

  }



  const action =

    raw.action === "CREATE" || raw.action === "UPDATE" || raw.action === "NONE"

      ? raw.action

      : "NONE";



  return {

    action,

    title: typeof raw.title === "string" ? raw.title : "",

    should_save: Boolean(raw.should_save),

  };

}

function normalizeExtractedData(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  const place_name = typeof row.place_name === "string" ? row.place_name : null;
  return {
    address: typeof row.address === "string" ? row.address : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    datetime: typeof row.datetime === "string" ? row.datetime : null,
    place_name: sanitizePlaceNameForNavigation(place_name, place_name),
    url: typeof row.url === "string" ? row.url : null,
  };
}

function normalizeBatchPending(raw: unknown): BatchPendingItem[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const items: BatchPendingItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const row = entry as Record<string, unknown>;
    if (typeof row.type !== "string") {
      continue;
    }

    const extractedRaw = row.extracted_data;
    let extracted: BatchPendingItem["extracted_data"];
    if (extractedRaw && typeof extractedRaw === "object") {
      const extractedRow = extractedRaw as Record<string, unknown>;
      extracted = {
        ...normalizeExtractedData(extractedRaw),
        schedule_note:
          typeof extractedRow.schedule_note === "string"
            ? extractedRow.schedule_note
            : undefined,
      };
    }

    items.push({
      type: row.type,
      summary: typeof row.summary === "string" ? row.summary : undefined,
      extracted_data: extracted,
    });
  }

  return items.length > 0 ? items : undefined;
}

function normalizeConfirmData(raw: unknown): OrchestratorConfirmationWire["confirm_data"] {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  if (typeof row.subject !== "string") {
    return undefined;
  }
  const category = row.category;
  const validCategory =
    category === "PLACE" ||
    category === "TIME" ||
    category === "CONTACT" ||
    category === "OTHER"
      ? category
      : "OTHER";
  return { subject: row.subject, category: validCategory };
}

function normalizeWittyButtons(raw: unknown): WittyButtonWire[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const buttons = raw
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const item = row as Record<string, unknown>;
      if (typeof item.label !== "string" || typeof item.action !== "string") {
        return null;
      }
      const label = item.label.trim();
      const action = item.action.trim();
      if (!label || !action) {
        return null;
      }
      return { label, action };
    })
    .filter((row): row is WittyButtonWire => row !== null);

  return buttons.length > 0 ? buttons.slice(0, 4) : undefined;
}

function normalizeConfirmation(raw: Record<string, unknown>): OrchestratorConfirmationWire | undefined {
  // CONFIRM-mode user input is classified in confirm-input-guard (system query vs location correction).
  const nested = raw.confirmation as OrchestratorConfirmationWire | undefined;
  const metaRaw = (raw.meta ?? nested?.meta) as { intent?: string } | undefined;
  const intent =
    metaRaw?.intent === "CONFIRM" ||
    metaRaw?.intent === "EXECUTE" ||
    metaRaw?.intent === "WITTY"
      ? metaRaw.intent
      : undefined;

  const witty_buttons =
    normalizeWittyButtons(raw.witty_buttons) ?? normalizeWittyButtons(nested?.witty_buttons);

  if (!intent && !nested?.meta?.intent) {
    if (
      typeof raw.persona_message === "string" &&
      witty_buttons?.length
    ) {
      const thought =
        typeof raw.thought === "string"
          ? raw.thought
          : typeof nested?.thought === "string"
            ? nested.thought
            : undefined;

      return {
        meta: { intent: "WITTY" },
        thought,
        persona_message: raw.persona_message,
        witty_buttons,
      };
    }
    return undefined;
  }

  const thought =
    typeof raw.thought === "string"
      ? raw.thought
      : typeof nested?.thought === "string"
        ? nested.thought
        : undefined;

  return {
    meta: { intent: intent ?? nested!.meta.intent },
    thought,
    persona_message:
      typeof raw.persona_message === "string"
        ? raw.persona_message
        : nested?.persona_message,
    confirm_message:
      typeof raw.confirm_message === "string"
        ? raw.confirm_message
        : nested?.confirm_message,
    confirm_data:
      normalizeConfirmData(raw.confirm_data) ?? nested?.confirm_data,
    extracted_data:
      normalizeExtractedData(raw.extracted_data) ?? nested?.extracted_data,
    batch_pending:
      normalizeBatchPending(raw.batch_pending) ?? nested?.batch_pending,
    witty_buttons,
  };
}



export function parseMasterOrchestratorJson(raw: string): MasterOrchestratorWire | null {

  try {

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const register = parseRegisterActionWire(parsed);
    if (register) {
      commitRegisterAction(register);
      return {
        summary: REGISTER_ACTION_CONFIRM_MESSAGE,
        actions: [],
        metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      };
    }

    const intent = parseActionIntentWire(parsed);
    if (intent) {
      return actionIntentToMasterWire(intent);
    }

    const dock = parseDockUpdateWire(parsed);
    if (dock) {
      return dockUpdateToMasterWire(dock);
    }

    const globalBrain = parseGlobalBrainActionableWire(parsed);
    if (globalBrain) {
      return globalBrainActionableToMasterWire(globalBrain);
    }

    const architect = parseActionArchitectWire(parsed);
    if (architect) {
      return actionArchitectToMasterWire(architect);
    }

    if (!parsed || typeof parsed.summary !== "string") {

      return null;

    }

    const confirmation = normalizeConfirmation(parsed);
    const thought =
      typeof parsed.thought === "string"
        ? parsed.thought
        : confirmation?.thought;

    return {

      summary: parsed.summary as string,

      thought,

      confidence_score: parsed.confidence_score as number | undefined,

      metadata: normalizeMetadata(
        parsed.metadata as MasterOrchestratorWire["metadata"]
      ),

      meta: parsed.meta as MasterOrchestratorWire["meta"],

      actions: Array.isArray(parsed.actions) ? (parsed.actions as OrchestratorActionWire[]) : [],

      schedule: normalizeSchedule(
        parsed.schedule as MasterOrchestratorWire["schedule"]
      ),

      container: normalizeContainer(
        parsed.container as MasterOrchestratorWire["container"]
      ),

      confirmation: normalizeConfirmation(parsed),

    };

  } catch {

    return null;

  }

}



/** @deprecated use parseMasterOrchestratorJson */

export function parseOrchestratorJson(raw: string): MasterOrchestratorWire | null {

  return parseMasterOrchestratorJson(raw);

}


