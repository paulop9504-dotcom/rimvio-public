import { buildTmapNavigateHref } from "@/lib/actions/domain-deep-links";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { buildNaverMapSearchHref } from "@/lib/resolvers/deep-links";
import type { PlaceDiscoveryContext } from "@/lib/context-resolver/places/types";
import type { CafeDiscoveryWire } from "@/lib/context-resolver/places/types";
import type { LinkActionItem } from "@/types/database";

function buildPlaceActions(place: PlaceDiscoveryContext["candidates"][number]): LinkActionItem[] {
  const actions: LinkActionItem[] = [
    createOpenAction({
      label: "티맵 길찾기",
      href: buildTmapNavigateHref(place.name, place.address),
      icon: "navigation",
      payload: { placeDiscovery: { name: place.name, role: "nav" } },
    }),
    createOpenAction({
      label: "지도",
      href: place.maps_url ?? buildNaverMapSearchHref(place.name),
      icon: "map",
      payload: { placeDiscovery: { name: place.name, role: "map" } },
    }),
  ];

  if (place.phone) {
    actions.push(
      createOpenAction({
        label: "전화하기",
        href: `tel:${place.phone.replace(/\D/g, "")}`,
        icon: "phone",
        payload: { placeDiscovery: { name: place.name, role: "call" } },
      })
    );
  }

  return actions;
}

/** Action Engine — decision cards, not a raw list dump. */
export function compilePlaceDiscovery(
  context: PlaceDiscoveryContext,
  options?: { categoryLabel?: string; anchor?: string | null }
): {
  wire: CafeDiscoveryWire;
  actions: LinkActionItem[];
} {
  const categoryLabel =
    options?.categoryLabel ??
    (context.criteria.category === "restaurant"
      ? "맛집"
      : context.criteria.category === "activity"
        ? "놀거리"
        : context.criteria.category === "cafe"
          ? "카페"
          : "장소");
  const anchorPrefix = options?.anchor ? `${options.anchor} 근처 ` : "근처 ";

  const optionsList = context.candidates.map((place) => ({
    name: place.name,
    reason: place.reason,
    rating: place.rating,
    thumbnail_url: place.thumbnail_url ?? null,
    photo_urls:
      place.photo_urls && place.photo_urls.length > 0
        ? place.photo_urls
        : place.thumbnail_url
          ? [place.thumbnail_url]
          : [],
    category: place.naver_category?.replace(/^음식점>/, "").replace(/>/g, " · ") ?? null,
    travel_minutes: place.travel_minutes,
    arrive_at: place.arrive_at_clock,
    action_buttons: buildPlaceActions(place).map((action) => ({
      label: action.label,
      href: action.href ?? "",
      icon: action.icon,
    })),
  }));

  const shadowNote = context.preference.shadow_hint
    ? ` ${context.preference.shadow_hint}인 곳을 우선 골랐어요.`
    : "";

  const vibeNote =
    context.criteria.vibe === "quiet" && categoryLabel === "카페" ? "조용한 " : "";

  const wire: CafeDiscoveryWire = {
    action: "SHOW_CAFE_CARDS",
    summary: `${anchorPrefix}${vibeNote}${categoryLabel} ${optionsList.length}곳을 찾았습니다.${shadowNote}`,
    options: optionsList,
  };

  const actions = context.candidates.flatMap((place, index) =>
    buildPlaceActions(place).map((action) => ({
      ...action,
      label: index === 0 ? `${place.name} · ${action.label}` : action.label,
      payload: {
        ...(action.payload ?? {}),
        placeDiscovery: {
          name: place.name,
          reason: place.reason,
          rating: place.rating,
          travel_minutes: place.travel_minutes,
          arrive_at: place.arrive_at_clock,
          primary: index === 0,
        },
      },
    }))
  );

  return { wire, actions: actions.slice(0, 8) };
}

function formatOptionRating(rating: number): string {
  return rating > 0 ? ` (★${rating.toFixed(1)})` : "";
}

export function formatPlaceDiscoveryHeadline(wire: CafeDiscoveryWire): string {
  return wire.summary;
}

export function formatPlaceDiscoverySummary(wire: CafeDiscoveryWire): string {
  const lines = [wire.summary, ""];

  for (const [index, option] of wire.options.entries()) {
    lines.push(`${index + 1}. **${option.name}**${formatOptionRating(option.rating)}`);
    if (option.reason) {
      lines.push(`   ${option.reason}`);
    }
    lines.push(`   지금 출발하면 ${option.arrive_at} 도착`);
  }

  lines.push("", "어디로 갈까요? 아래에서 골라주세요.");

  return lines.join("\n");
}

/** @deprecated use compilePlaceDiscovery */
export const compileCafeDiscovery = compilePlaceDiscovery;
export const formatCafeDiscoverySummary = formatPlaceDiscoverySummary;
