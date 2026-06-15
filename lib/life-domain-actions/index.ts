export type { LifeDomainActionDef, LifeDomainCatalogEntry, LifeDomainKey } from "@/lib/life-domain-actions/types";
export {
  LIFE_DOMAIN_BY_KEY,
  LIFE_DOMAIN_CATALOG,
  listLifeDomainKeys,
} from "@/lib/life-domain-actions/catalog";
export {
  buildAllLifeDomainActions,
  buildLifeDomainActionById,
  buildLifeDomainActions,
} from "@/lib/life-domain-actions/build-actions";
export {
  detectLifeDomain,
  isKnownLifeDomain,
  isLifeDomainBoardRequest,
  resolveLifeDomainLabel,
} from "@/lib/life-domain-actions/detect-domain";
export {
  orchestrateLifeDomainActions,
  orchestrateLifeDomainByKey,
} from "@/lib/life-domain-actions/orchestrate-life-domain";
