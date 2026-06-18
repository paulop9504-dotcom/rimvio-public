export type LifeDomainKey =
  | "study"
  | "work"
  | "travel"
  | "health"
  | "finance"
  | "relationship"
  | "daily_life";

export type LifeDomainActionDef = {
  id: string;
  label: string;
  plugin: string;
  tier: "MAIN" | "AUX";
  icon: string;
};

export type LifeDomainCatalogEntry = {
  key: LifeDomainKey;
  label: string;
  subtitle: string;
  emoji: string;
  actions: LifeDomainActionDef[];
};
