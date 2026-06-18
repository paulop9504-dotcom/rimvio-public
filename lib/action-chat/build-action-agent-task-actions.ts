import { validateLinkAction } from "@/lib/actions/action-validator";
import { buildTmapNavigateHref } from "@/lib/actions/domain-deep-links";
import { buildGoogleCalendarTimedHref } from "@/lib/actions/schedule-link-execution";
import { createCallAction, createOpenAction } from "@/lib/enrichers/action-factory";
import {
  buildContactActionLabel,
  toDialPrepTelHref,
} from "@/lib/enrichers/extract-phone";
import { buildNaverMapSearchWebHref } from "@/lib/resolvers/deep-links";
import {
  normalizeExtractedPlaceData,
  sanitizePlaceNameForNavigation,
} from "@/lib/action-chat/resolve-navigation-place";
import type {
  ActionAgentActionWire,
  ActionAgentExtractedData,
  ActionAgentTaskResult,
  ActionAgentTaskType,
} from "@/lib/action-chat/action-agent-types";
import type { LinkActionItem } from "@/types/database";

function emptyExtracted(): ActionAgentExtractedData {
  return {
    address: null,
    phone: null,
    datetime: null,
    place_name: null,
    url: null,
    schedule_note: null,
  };
}

export function buildActionAgentTaskActions(
  type: ActionAgentTaskType,
  data: ActionAgentExtractedData
): ActionAgentActionWire[] {
  if (type === "PHONE" && data.phone) {
    return [
      {
        label: buildContactActionLabel(data.phone),
        url: toDialPrepTelHref(data.phone),
        icon: "phone",
      },
    ];
  }

  if (type === "ADDRESS" && data.address) {
    const placeName =
      sanitizePlaceNameForNavigation(data.place_name, data.place_name) || data.address;
    const href = buildTmapNavigateHref(placeName, data.address);
    return [
      {
        label: "네비게이션",
        url: href,
        icon: "navigation",
      },
    ];
  }

  if (type === "DATETIME" && data.datetime) {
    const start = new Date(data.datetime);
    const title =
      data.schedule_note?.trim() ||
      sanitizePlaceNameForNavigation(data.place_name, data.place_name)?.trim() ||
      "일정";
    return [
      {
        label: "일정 추가",
        url: buildGoogleCalendarTimedHref({ title, start, durationMinutes: 60 }),
        icon: "calendar",
      },
    ];
  }

  if (type === "URL" && data.url) {
    return [
      {
        label: "링크 열기",
        url: data.url,
        icon: "link",
      },
    ];
  }

  if (type === "PLACE" && (data.place_name || data.address)) {
    const placeName =
      sanitizePlaceNameForNavigation(data.place_name, data.place_name) ||
      data.address!.split(" ")[0]!;
    const href = buildTmapNavigateHref(placeName, data.address);
    const actions: ActionAgentActionWire[] = [
      { label: "네비게이션", url: href, icon: "navigation" },
    ];
    if (data.phone) {
      actions.unshift({
        label: buildContactActionLabel(data.phone),
        url: toDialPrepTelHref(data.phone),
        icon: "phone",
      });
    }
    if (data.url) {
      actions.push({ label: "홈페이지", url: data.url, icon: "globe" });
    }
    return actions.slice(0, 4);
  }

  return [];
}

export function actionAgentWiresToLinkItems(
  task: Pick<ActionAgentTaskResult, "type" | "extracted_data" | "actions">
): LinkActionItem[] {
  const wires = task.actions.length
    ? task.actions
    : buildActionAgentTaskActions(task.type, task.extracted_data);

  return wires.map((wire) => {
    if (/^tel:/i.test(wire.url)) {
      const phone = wire.url.replace(/^tel:/i, "");
      const call = createCallAction(phone, wire.label);
      return validateLinkAction({
        ...call,
        payload: {
          ...(call.payload ?? {}),
          actionAgent: true,
          actionAgentType: task.type,
          dialPrep: true,
        },
      });
    }

    const isNavigation = wire.label === "네비게이션";
    const placeName = task.extracted_data.place_name;
    const navAddress = task.extracted_data.address;
    const query = [placeName, navAddress].filter(Boolean).join(" ").trim();

    return validateLinkAction(
      createOpenAction({
        label: wire.label,
        href: wire.url,
        icon: wire.icon ?? "link",
        copyText: isNavigation ? query : wire.url,
        fallbackHref: isNavigation && query ? buildNaverMapSearchWebHref(query) : undefined,
        payload: {
          actionAgent: true,
          actionAgentType: task.type,
          ...(task.type === "DEEP_LINK"
            ? {
                deepLinkDispatch: true,
                dispatchStatus: "READY_TO_EXECUTE",
              }
            : {}),
          ...(isNavigation
            ? {
                navSector: true,
                entityNavigate: true,
                navPlaceName: placeName,
                navAddress: navAddress,
              }
            : {}),
        },
      })
    );
  });
}

export function summarizeActionAgentTask(
  type: ActionAgentTaskType,
  data: ActionAgentExtractedData
) {
  if (type === "PHONE" && data.phone) {
    return `연락처 · ${data.phone}`;
  }
  if (type === "ADDRESS" && data.address) {
    return data.place_name ? `${data.place_name} · ${data.address}` : data.address;
  }
  if (type === "DATETIME" && data.datetime) {
    return data.schedule_note
      ? `${data.schedule_note} · ${data.datetime.replace("T", " ")}`
      : data.datetime.replace("T", " ");
  }
  if (type === "URL" && data.url) {
    return data.url.replace(/^https?:\/\//, "").slice(0, 48);
  }
  if (type === "PLACE" && data.place_name) {
    return data.place_name;
  }
  if (type === "DEEP_LINK") {
    return data.schedule_note?.trim() || "앱 실행";
  }
  return type;
}

export function normalizeActionAgentExtracted(
  partial?: Partial<ActionAgentExtractedData> | null,
  sourceMessage?: string | null
): ActionAgentExtractedData {
  const base = emptyExtracted();
  if (!partial) {
    return base;
  }

  return normalizeExtractedPlaceData(
    {
      address: partial.address ?? null,
      phone: partial.phone ?? null,
      datetime: partial.datetime ?? null,
      place_name: partial.place_name ?? null,
      url: partial.url ?? null,
      schedule_note: partial.schedule_note ?? null,
    },
    sourceMessage
  );
}
