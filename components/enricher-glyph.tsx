"use client";

import { createElement } from "react";
import {
  Clapperboard,
  Code2,
  Globe,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Package,
  Play,
  ShoppingBag,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { EnrichedLink } from "@/lib/enrichers/types";
import { cn } from "@/lib/utils";

type EnricherSourceType = EnrichedLink["source_type"] | string | null | undefined;

const GLYPH_BY_SOURCE: Record<string, LucideIcon> = {
  youtube: Play,
  ott: Clapperboard,
  map: MapPin,
  transport: MapPin,
  ticket: Ticket,
  commerce: ShoppingBag,
  delivery: Package,
  github: Code2,
  kakao: MessageCircle,
  naver: MessageCircle,
  portal: LayoutGrid,
  generic: Globe,
};

export function resolveEnricherGlyph(sourceType: EnricherSourceType): LucideIcon {
  if (!sourceType) {
    return Globe;
  }

  return GLYPH_BY_SOURCE[sourceType] ?? Globe;
}

export function EnricherGlyph({
  sourceType,
  className,
  strokeWidth = 2.25,
}: {
  sourceType: EnricherSourceType;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = GLYPH_BY_SOURCE[String(sourceType ?? "")] ?? Globe;

  return createElement(Icon, {
    className: cn("shrink-0", className),
    strokeWidth,
  });
}
