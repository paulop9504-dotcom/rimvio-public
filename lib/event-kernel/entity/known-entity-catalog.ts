import type { EntityType, EntityTypeGuess } from "@/lib/event-kernel/entity/entity-action-surface-types";

type CatalogEntry = {
  keys: readonly string[];
  entityType: EntityType;
  confidence: number;
};

/** Normalized lookup — major global companies/brands users ask about by name only. */
const KNOWN_ENTITIES: CatalogEntry[] = [
  {
    keys: ["애플", "apple"],
    entityType: "COMPANY",
    confidence: 0.92,
  },
  {
    keys: ["코카콜라", "cocacola", "coca-cola", "coca cola"],
    entityType: "COMPANY",
    confidence: 0.92,
  },
  {
    keys: ["펩시", "pepsi", "pepsico"],
    entityType: "COMPANY",
    confidence: 0.9,
  },
  {
    keys: ["마이크로소프트", "microsoft", "ms"],
    entityType: "COMPANY",
    confidence: 0.9,
  },
  {
    keys: ["구글", "google", "alphabet"],
    entityType: "COMPANY",
    confidence: 0.9,
  },
  {
    keys: ["amazon"],
    entityType: "COMPANY",
    confidence: 0.9,
  },
  {
    keys: ["테슬라", "tesla"],
    entityType: "COMPANY",
    confidence: 0.9,
  },
  {
    keys: ["나이키", "nike"],
    entityType: "COMPANY",
    confidence: 0.88,
  },
  {
    keys: ["스타벅스", "starbucks"],
    entityType: "RESTAURANT",
    confidence: 0.9,
  },
];

function normalizeEntityKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "");
}

const KEY_INDEX = new Map<string, CatalogEntry>();
for (const entry of KNOWN_ENTITIES) {
  for (const key of entry.keys) {
    KEY_INDEX.set(normalizeEntityKey(key), entry);
  }
}

export function lookupKnownEntity(entity: string): EntityTypeGuess | null {
  const trimmed = entity.trim();
  if (!trimmed) {
    return null;
  }
  const entry = KEY_INDEX.get(normalizeEntityKey(trimmed));
  if (!entry) {
    return null;
  }
  return {
    entity: trimmed,
    entityType: entry.entityType,
    confidence: entry.confidence,
  };
}
