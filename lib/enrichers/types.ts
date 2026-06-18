import type { LinkCategory } from "@/lib/categories/types";
import type { SmartSuite } from "@/lib/actions/smart-suite-types";
import type { RouterResult } from "@/lib/routing/intelligent-router";
import type { LinkActionItem } from "@/types/database";

export type LocationCategory = "commute" | "home" | "office" | "unknown";

export type CategoryWeights = Partial<Record<LinkCategory, number>>;
export type SuiteWeights = Partial<Record<SmartSuite, number>>;

export type EnricherContext = {
  hour: number;
  installedApps: string[];
  locationCategory: LocationCategory;
  categoryWeights?: CategoryWeights;
  suiteWeights?: SuiteWeights;
  pinnedSuites?: SmartSuite[];
  routing?: RouterResult;
  /** Skip duplicate HTML fetch when scrape/intent pipeline already loaded metadata. */
  preloadedPageMetadata?: PageMetadata | null;
};

export type EnricherFallback = {
  gradient: string;
  initial: string;
  titleFromDomain: boolean;
  imageFromFallback: boolean;
};

export type EnrichedLink = {
  url: string;
  domain: string;
  title: string;
  image: string | null;
  description: string | null;
  actions: LinkActionItem[];
  enricher_id: string;
  source_type:
    | "generic"
    | "youtube"
    | "github"
    | "map"
    | "commerce"
    | "kakao"
    | "transport"
    | "delivery"
    | "ott"
    | "ticket"
    | "naver"
    | "portal";
  fallback: EnricherFallback;
  routing?: RouterResult;
};

export type PageMetadata = {
  url: string;
  domain: string;
  title: string | null;
  image: string | null;
  description: string | null;
  phone: string | null;
  priceWon?: number | null;
};

export type Enricher = {
  id: string;
  domains?: string[];
  enrich: (url: string, context: EnricherContext) => Promise<EnrichedLink>;
};
