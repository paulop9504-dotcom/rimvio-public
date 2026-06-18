import type { PackingListItem } from "@/lib/trip-controller/types";

export type PackingTemplate = {
  id: string;
  label: string;
  match: RegExp;
  items: string[];
};

export const PACKING_TEMPLATES: PackingTemplate[] = [
  {
    id: "default",
    label: "기본",
    match: /.*/u,
    items: ["여권", "충전기", "옷", "세면도구", "상비약"],
  },
  {
    id: "tokyo",
    label: "도쿄",
    match: /(?:도쿄|tokyo|일본|japan)/iu,
    items: ["여권", "충전기", "옷", "엔화/카드", "포켓 와이파이", "우산"],
  },
  {
    id: "beach",
    label: "해변",
    match: /(?:제주|해변|beach|swim)/iu,
    items: ["여권", "수영복", "선크림", "충전기", "슬리퍼"],
  },
];

export function resolvePackingTemplate(destination: string): PackingTemplate {
  const hit =
    PACKING_TEMPLATES.find(
      (template) => template.id !== "default" && template.match.test(destination)
    ) ?? PACKING_TEMPLATES[0]!;
  return hit;
}

export function buildPackingItems(template: PackingTemplate): PackingListItem[] {
  return template.items.map((item, index) => ({
    id: `${template.id}-${index}`,
    item,
    checked: false,
  }));
}
