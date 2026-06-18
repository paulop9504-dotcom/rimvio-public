#!/usr/bin/env npx tsx
/**
 * Export Play Console listing copy (KO) for paste into Google Play Console.
 * Usage: npm run store:export:play
 */

import fs from "node:fs";
import path from "node:path";
import { RIMVIO } from "@/lib/brand/rimvio";
import { STORE_LAUNCH } from "@/lib/mobile/store-launch-config";
import { STORE_META } from "@/lib/pwa/store-meta";

const prodUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  process.env.CAPACITOR_SERVER_URL?.replace(/\/$/, "") ??
  "https://rimvio.vercel.app";

const privacyUrl = `${prodUrl}${STORE_LAUNCH.privacyPath}`;

const listing = `# Rimvio — Google Play Console listing (KO)
# Generated ${new Date().toISOString().slice(0, 10)} — paste fields into Play Console

## App identity
App name: ${RIMVIO.name}
Default language: Korean (ko-KR)
Application ID: ${STORE_LAUNCH.android.applicationId}
Category: ${STORE_META.category}

## Short description (80 chars max)
${STORE_META.shortDescription}

## Full description
${STORE_META.longDescription}

## Privacy policy URL
${privacyUrl}

## Contact / website
Website: ${prodUrl}
Email: (your support email — fill before submit)

## Tags / keywords (internal notes)
${STORE_META.keywords.join(", ")}

## Phone screenshots (upload paths in repo)
1. ${STORE_META.screenshots.peers.label}
   public${STORE_META.screenshots.peers.path}
2. ${STORE_META.screenshots.feed.label}
   public${STORE_META.screenshots.feed.path}
3. ${STORE_META.screenshots.welcome.label}
   public${STORE_META.screenshots.welcome.path}

## Feature graphic / icon
Icon 512: public${STORE_META.icons.p512}
OG cover (optional): public${STORE_META.ogImage}

---

## Data safety — v1 honest defaults (review before submit)

| Data type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Photos / videos | Yes (opt-in, on-device match) | No (not full library upload) | Experience context on Globe |
| Approximate location | Yes (when user adds context) | No | Pin / recall on map |
| App activity (links shared) | Yes | No | Feed actions from Share |
| Personal info (account) | If Supabase login used | No | Sync across devices |
| Device IDs | Minimal (analytics if enabled) | No | Product improvement |

User can use app without account (local-only mode).

Permissions declared in app:
- INTERNET — load Rimvio web app
- READ_MEDIA_IMAGES / READ_MEDIA_VIDEO — opt-in photo match for experiences

NOT in Play v1 manifest:
- Notification listener (removed for review)

---

## Internal testing release notes (v1.0.0)
- Capacitor shell → ${prodUrl}
- Share link from other apps → Rimvio action card
- Globe personal traces + Bridge media
- Report issues: (your email)
`;

const outDir = path.join(process.cwd(), "docs", "generated");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "play-store-listing-ko.txt");
fs.writeFileSync(outPath, listing, "utf8");

console.log(`✓ Play listing exported → ${outPath}`);
console.log("");
console.log(listing);
