#!/usr/bin/env npx tsx
/**
 * Guest + avatar draw invariants.
 * Usage: npm run test:guest
 */

import assert from "node:assert/strict";
import {
  RIMVIO_AVATAR_VARIANTS,
  listAvatarOddsDisplay,
  rollRimvioAvatarVariant,
} from "../lib/brand/rimvio-avatar-colors";
import {
  buildDrawnGuestRecord,
  buildPendingGuestRecord,
  guestNeedsAvatarDraw,
  normalizeGuestRecord,
} from "../lib/rooms/guest-normalize";

type Case = {
  name: string;
  fn: () => void;
};

const fallback = buildPendingGuestRecord({
  id: "guest-fallback",
  label: "테스트",
});

const cases: Case[] = [
  {
    name: "avatar weights sum to 100",
    fn: () => {
      const total = listAvatarOddsDisplay().reduce((sum, row) => sum + row.weight, 0);
      assert.equal(total, 100);
    },
  },
  {
    name: "roll boundaries: red at 0%",
    fn: () => {
      assert.equal(rollRimvioAvatarVariant(0), "red");
      assert.equal(rollRimvioAvatarVariant(0.349), "red");
    },
  },
  {
    name: "roll boundaries: orange at 35%",
    fn: () => {
      assert.equal(rollRimvioAvatarVariant(0.35), "orange");
    },
  },
  {
    name: "roll boundaries: purple at 99%+",
    fn: () => {
      assert.equal(rollRimvioAvatarVariant(0.999), "purple");
    },
  },
  {
    name: "legacy stored variant migrates to drawn guest",
    fn: () => {
      const guest = normalizeGuestRecord(
        {
          id: "guest-1",
          label: "민지",
          avatarVariant: "blue",
        },
        fallback
      );
      assert.equal(guest.avatarDrawn, true);
      assert.equal(guest.avatarVariant, "blue");
      assert.equal(guest.color, RIMVIO_AVATAR_VARIANTS.blue.accent);
    },
  },
  {
    name: "explicit avatarDrawn=false stays pending",
    fn: () => {
      const guest = normalizeGuestRecord(
        {
          id: "guest-1",
          label: "민지",
          avatarVariant: "blue",
          avatarDrawn: false,
        },
        fallback
      );
      assert.equal(guest.avatarDrawn, false);
      assert.equal(guest.avatarVariant, null);
      assert.equal(guestNeedsAvatarDraw(guest), true);
    },
  },
  {
    name: "id+label without variant stays pending (fresh user)",
    fn: () => {
      const guest = normalizeGuestRecord(
        {
          id: "guest-new",
          label: "준호",
        },
        fallback
      );
      assert.equal(guest.avatarDrawn, false);
      assert.equal(guest.avatarVariant, null);
    },
  },
  {
    name: "drawn guest keeps accent color",
    fn: () => {
      const guest = buildDrawnGuestRecord({
        id: "guest-1",
        label: "하은",
        avatarVariant: "green",
      });
      assert.equal(guest.avatarDrawn, true);
      assert.equal(guest.color, RIMVIO_AVATAR_VARIANTS.green.accent);
    },
  },
];

let failed = 0;

for (const testCase of cases) {
  try {
    testCase.fn();
    console.log(`✓ ${testCase.name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${testCase.name}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} guest/avatar checks passed.`);
