import type { LucideIcon } from "lucide-react";
import {
  Bus,
  CalendarClock,
  FolderPlus,
  MapPin,
  MessageCircle,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";

export type ContainerPresentation = {
  icon: LucideIcon;
  title: string;
  body: string;
  chips: string[];
};

function readEntityTitle(message: ActionChatMessage) {
  const entityAction = message.actions?.find((action) => action.payload?.entityArchitect);
  const placeName =
    typeof entityAction?.payload?.navPlaceName === "string"
      ? entityAction.payload.navPlaceName.trim()
      : "";
  const navAddress =
    typeof entityAction?.payload?.navAddress === "string"
      ? entityAction.payload.navAddress.trim()
      : "";

  if (placeName || navAddress) {
    return [placeName, navAddress].filter(Boolean).join(" · ");
  }

  return null;
}

function splitTitleBody(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { title: "림비오 제안", body: "" };
  }

  const firstLine = trimmed.split("\n")[0]?.trim() ?? trimmed;
  const dotParts = firstLine.split(" · ");
  if (dotParts.length > 1 && dotParts[0]!.length <= 28) {
    return {
      title: dotParts[0]!.trim(),
      body: [dotParts.slice(1).join(" · "), ...trimmed.split("\n").slice(1)]
        .filter(Boolean)
        .join("\n")
        .trim(),
    };
  }

  if (firstLine.length <= 24 && trimmed.includes("\n")) {
    return {
      title: firstLine,
      body: trimmed.split("\n").slice(1).join("\n").trim(),
    };
  }

  if (/정보$/.test(firstLine) && firstLine.length <= 32) {
    return { title: firstLine.replace(/\s*정보$/, "").trim() || firstLine, body: "" };
  }

  return { title: "림비오 제안", body: trimmed };
}

function resolveIcon(message: ActionChatMessage): LucideIcon {
  if (message.cafeDiscovery) {
    return UtensilsCrossed;
  }

  if (message.transportLive) {
    return Bus;
  }

  if (message.schedule?.tasks?.length) {
    return CalendarClock;
  }

  if (message.container?.should_save) {
    return FolderPlus;
  }

  if (message.actions?.some((action) => action.payload?.entityArchitect)) {
    return MapPin;
  }

  if (message.confirmation?.meta?.intent === "CONFIRM") {
    return MapPin;
  }

  if (message.confirmation?.meta?.intent === "WITTY") {
    return Sparkles;
  }

  if (message.metadata?.intent === "SCHEDULE") {
    return CalendarClock;
  }

  if (message.metadata?.intent === "CONTAINER_MGMT") {
    return FolderPlus;
  }

  if (message.actions?.length) {
    return Sparkles;
  }

  return MessageCircle;
}

function buildChips(message: ActionChatMessage) {
  const chips: string[] = [];

  if (message.schedule?.tasks?.length) {
    for (const task of message.schedule.tasks.slice(0, 2)) {
      chips.push(`${task.time} ${task.task}`);
    }
  }

  if (message.transportLive) {
    const { data } = message.transportLive;
    chips.push(`${data.route} · ${data.minutes_until}분 후`);
    chips.push(data.location);
  }

  const entityLine = readEntityTitle(message);
  if (entityLine && !chips.includes(entityLine)) {
    chips.push(entityLine);
  }

  return chips.slice(0, 3);
}

export function resolveContainerPresentation(message: ActionChatMessage): ContainerPresentation {
  if (message.entityQuickPick) {
    return {
      icon: Sparkles,
      title: "림비오 제안",
      body: message.entityQuickPick.lead,
      chips: message.entityQuickPick.options.map((option) => option.label),
    };
  }

  if (message.cafeDiscovery) {
    return {
      icon: UtensilsCrossed,
      title: message.cafeDiscovery.summary,
      body: "",
      chips: message.cafeDiscovery.options
        .map((option) => option.name)
        .filter(Boolean)
        .slice(0, 5),
    };
  }

  const entityTitle = readEntityTitle(message);
  const split = splitTitleBody(message.text);
  const transportTitle = message.transportLive
    ? `${message.transportLive.data.route} 실시간`
    : null;

  if (message.confirmation?.meta?.intent === "CONFIRM") {
    const place = message.confirmation.extracted_data?.place_name;
    return {
      icon: MapPin,
      title: place ? `${place} 확인` : "장소 확인",
      body: "",
      chips: [],
    };
  }

  if (message.scheduledDelivery?.status === "pending") {
    const place = message.scheduleExtract?.place_name;
    return {
      icon: Sparkles,
      title: place ? `${place} 예약` : "예약된 이동",
      body: "",
      chips: [],
    };
  }

  if (message.confirmation?.meta?.intent === "WITTY") {
    return {
      icon: Sparkles,
      title: "함께하는 대화",
      body: "",
      chips: [],
    };
  }

  let title = transportTitle || split.title;
  let body = split.body;
  const chips = buildChips(message);

  if (entityTitle) {
    const entityName = entityTitle.split(" · ")[0]?.trim();
    if (entityName) {
      title = entityName;
    }
  }

  if (!body && message.text.trim() && message.text.trim() !== title) {
    body = message.text.trim();
  }

  if (body === title) {
    body = "";
  }

  return {
    icon: resolveIcon(message),
    title,
    body,
    chips,
  };
}

export function isActionContainerMessage(message: ActionChatMessage) {
  if (message.loading) {
    return true;
  }

  return Boolean(
    message.entityQuickPick ||
      message.cafeDiscovery ||
      message.actions?.length ||
      message.transportLive ||
      message.schedule?.tasks?.length ||
      message.container?.should_save ||
      message.confirmation?.meta?.intent === "CONFIRM" ||
      message.confirmation?.meta?.intent === "WITTY" ||
      message.scheduledDelivery?.status === "pending"
  );
}
