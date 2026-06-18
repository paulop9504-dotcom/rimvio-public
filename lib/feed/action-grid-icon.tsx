import {
  Bookmark,
  Calendar,
  Car,
  Copy,
  ExternalLink,
  FileText,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { readUniversalPillar } from "@/lib/actions/universal-action-pillar";
import type { LinkActionItem } from "@/types/database";

const TILE_COLORS = [
  "bg-[#FEE2E2] text-[#DC2626]",
  "bg-[#DBEAFE] text-[#2563EB]",
  "bg-[#FEF3C7] text-[#D97706]",
  "bg-[#D1FAE5] text-[#059669]",
] as const;

export function actionGridTileColor(index: number) {
  return TILE_COLORS[index % TILE_COLORS.length];
}

export function resolveActionGridIcon(action: LinkActionItem): LucideIcon {
  const pillar = readUniversalPillar(action);
  if (pillar === "go") {
    return MapPin;
  }
  if (pillar === "save") {
    return Bookmark;
  }
  if (pillar === "deep_dive") {
    return FileText;
  }
  if (pillar === "connect") {
    const href = action.href ?? "";
    if (href.startsWith("tel:") || href.startsWith("telprompt:")) {
      return Phone;
    }
    return Share2;
  }

  const label = action.label.toLowerCase();
  const payloadIcon =
    typeof action.payload?.icon === "string" ? action.payload.icon : "";

  if (payloadIcon === "map" || /지도|map|위치|길찾/.test(label)) {
    return MapPin;
  }
  if (/네비|navigate|navigation|길찾기/.test(label)) {
    return Navigation;
  }
  if (/전화|call|tel/.test(label)) {
    return Phone;
  }
  if (/리뷰|review|별|blog/.test(label)) {
    return Star;
  }
  if (/최저|가격|쇼핑|shopping|cart|구매/.test(label)) {
    return ShoppingCart;
  }
  if (/카톡|공유|share|친구/.test(label)) {
    return Share2;
  }
  if (/캘린더|calendar|일정|예약/.test(label)) {
    return Calendar;
  }
  if (/검색|search/.test(label)) {
    return Search;
  }
  if (/복사|copy/.test(label)) {
    return Copy;
  }
  if (/요약|정리|sparkle|ai/.test(label)) {
    return Sparkles;
  }
  if (action.kind === "share") {
    return Share2;
  }
  if (/카카오|메신저|talk/.test(label)) {
    return MessageCircle;
  }
  if (/카카오t|택시|taxi|car/.test(label)) {
    return Car;
  }

  return ExternalLink;
}
