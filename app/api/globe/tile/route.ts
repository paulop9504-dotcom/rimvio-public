import { type NextRequest, NextResponse } from "next/server";
import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { resolveGlobeTileUpstreamUrl } from "@/lib/experience-graph/resolve-globe-tile-upstream";
import {
  remapRimvioGlobeMapTilePng,
  shouldRemapRimvioGlobeMapTileStyle,
} from "@/lib/globe/remap-rimvio-globe-map-tile-png";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const z = Number(params.get("z"));
  const x = Number(params.get("x"));
  const y = Number(params.get("y"));
  const style = (params.get("style")?.trim() || "satellite") as GlobeMapTileStyle;

  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return NextResponse.json({ error: "invalid_tile_coords" }, { status: 400 });
  }

  const upstream = resolveGlobeTileUpstreamUrl({ z, x, y, style });
  if (!upstream) {
    return NextResponse.json({ error: "invalid_tile_style" }, { status: 400 });
  }

  try {
    const response = await fetch(upstream, {
      headers: { "User-Agent": "RimvioGlobe/1.0" },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "tile_upstream_failed" }, { status: 502 });
    }
    const raw = Buffer.from(await response.arrayBuffer());
    let body: Buffer = raw;
    if (shouldRemapRimvioGlobeMapTileStyle(style)) {
      try {
        body = remapRimvioGlobeMapTilePng(raw);
      } catch {
        body = raw;
      }
    }
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch {
    return NextResponse.json({ error: "tile_fetch_failed" }, { status: 502 });
  }
}
