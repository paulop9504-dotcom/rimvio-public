import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";
import { FROZEN_SHARE_TARGET } from "@/lib/share/share-target-config";
import { copy } from "@/lib/copy/human-ko";
import { RIMVIO } from "@/lib/brand/rimvio";
import { STORE_META } from "@/lib/pwa/store-meta";

const SHARE_TARGET = FROZEN_SHARE_TARGET;

function publicFileExists(relativePath: string) {
  return fs.existsSync(path.join(process.cwd(), "public", relativePath.replace(/^\//, "")));
}

function manifestIcons(): MetadataRoute.Manifest["icons"] {
  const pngSizes = [192, 512, 1024] as const;
  const icons: NonNullable<MetadataRoute.Manifest["icons"]> = [];

  for (const size of pngSizes) {
    const relative = `/icons/icon-${size}.png`;
    if (publicFileExists(relative)) {
      icons.push({
        src: relative,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      });
      icons.push({
        src: relative,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "maskable",
      });
    }
  }

  if (icons.length === 0) {
    icons.push(
      {
        src: "/rimvio-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/rimvio-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      }
    );
  }

  return icons;
}

export default function manifest(): MetadataRoute.Manifest {
  const screenshots = [
    STORE_META.screenshots.peers,
    STORE_META.screenshots.feed,
    STORE_META.screenshots.welcome,
  ]
    .filter((shot) => publicFileExists(shot.path))
    .map((shot) => ({
      src: shot.path,
      sizes: `${shot.width}x${shot.height}`,
      type: "image/png" as const,
      form_factor: "narrow" as const,
      label: shot.label,
    }));

  return {
    id: "/",
    name: `${RIMVIO.name} · ${RIMVIO.nameKo}`,
    short_name: RIMVIO.name,
    description: STORE_META.shortDescription,
    lang: "ko-KR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#1c1c1c",
    theme_color: "#1c1c1c",
    orientation: "portrait",
    categories: ["productivity", "utilities"],
    icons: manifestIcons(),
    ...(screenshots.length > 0 ? { screenshots } : {}),
    share_target: SHARE_TARGET,
  };
}
