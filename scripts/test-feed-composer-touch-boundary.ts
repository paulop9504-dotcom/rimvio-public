#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const globals = readFileSync(join(root, "app/globals.css"), "utf8");
const feed = readFileSync(join(root, "components/action-chat-feed.tsx"), "utf8");
const appNav = readFileSync(join(root, "components/app-nav.tsx"), "utf8");
const mentionField = readFileSync(
  join(root, "components/action-chat/composer-mention-field.tsx"),
  "utf8",
);

const mobileDockRoot = globals.match(
  /\.rimvio-feed-composer-dock \{[\s\S]*?background: linear-gradient/,
)?.[0];

assert.ok(mobileDockRoot, "mobile composer dock root block missing");
assert.ok(
  !/pointer-events:\s*none/.test(mobileDockRoot ?? ""),
  "composer dock root must not use pointer-events:none (blocks typing)",
);
assert.ok(
  /position:\s*sticky/.test(mobileDockRoot ?? ""),
  "mobile composer must use sticky (fixed inside overflow shells breaks focus)",
);
assert.ok(
  !/position:\s*fixed/.test(mobileDockRoot ?? ""),
  "mobile composer dock must not use position:fixed",
);
assert.ok(
  /z-index:\s*40/.test(mobileDockRoot ?? ""),
  "composer dock must stay below portaled bottom nav (z-9999)",
);
assert.ok(
  globals.includes(".rimvio-feed-composer-dock .rimvio-composer-textarea--mirror"),
  "textarea touch rules must target composer dock",
);
assert.ok(
  globals.includes("body:has(.app-nav-bottom-frame) .app-shell-viewport.h-dvh"),
  "immersive shell must reserve bottom inset for tab bar",
);
assert.ok(
  /(?:@utility\s+app-nav-bottom-frame|\.app-nav-bottom-frame)\s*\{[^}]*pointer-events:\s*auto/s.test(
    globals,
  ),
  "bottom nav frame must capture touches on iOS/PWA (no pointer-events:none parent)",
);
assert.ok(
  appNav.includes("createPortal") && appNav.includes("data-rimvio-bottom-nav-portal"),
  "bottom nav must portal to document.body for reliable PWA taps",
);
assert.ok(
  feed.includes('data-feed-composer-dock'),
  "feed must mark composer dock for debugging/tests",
);
assert.ok(
  feed.includes("rimvio-feed-composer-dock") && feed.includes("<ActionChatInputBar"),
  "composer dock must wrap ActionChatInputBar",
);
assert.ok(
  !feed.includes('className="rimvio-feed-composer-dock shrink-0 lg:relative lg:z-[2]"'),
  "dock class must not be passed directly to ActionChatInputBar",
);
assert.ok(
  mentionField.includes("focus({ preventScroll: true })"),
  "composer field must focus textarea on pointer down fallback",
);

console.log("test-feed-composer-touch-boundary: ok");
