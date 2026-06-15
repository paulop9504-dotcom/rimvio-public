import type {
  MarketplaceDomain,
  SurfaceTemplatePack,
} from "@/lib/marketplace/marketplace-contract";
import { isRuntimeCompatible } from "@/lib/platform/versioned-runtime";
import type { PlatformRuntimeVersion } from "@/lib/platform/platform-contract";

const packs = new Map<string, SurfaceTemplatePack>();

export function publishSurfacePack(
  pack: SurfaceTemplatePack,
): { ok: true } | { ok: false; reason: string } {
  const key = `${pack.packId}@${pack.version}`;
  if (packs.has(key)) {
    return { ok: false, reason: "surface_pack_version_conflict" };
  }
  if (pack.templates.length === 0) {
    return { ok: false, reason: "surface_pack_empty" };
  }
  packs.set(key, pack);
  return { ok: true };
}

export function getSurfacePack(packId: string, version: string): SurfaceTemplatePack | null {
  return packs.get(`${packId}@${version}`) ?? null;
}

export function listSurfacePacks(domain?: MarketplaceDomain): readonly SurfaceTemplatePack[] {
  const rows = [...packs.values()];
  if (!domain) {
    return rows;
  }
  return rows.filter((row) => row.domain === domain);
}

export function isSurfacePackCompatible(
  pack: SurfaceTemplatePack,
  hostRuntime: PlatformRuntimeVersion,
): boolean {
  return pack.compatibleRuntime.some((version) => isRuntimeCompatible(version, hostRuntime));
}

export function resetSurfaceTemplateStoreForTests(): void {
  packs.clear();
}
