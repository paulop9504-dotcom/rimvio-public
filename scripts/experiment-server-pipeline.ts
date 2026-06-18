#!/usr/bin/env npx tsx
/**
 * Backend pipeline checks (no network except optional Supabase health).
 * Usage: npm run experiment:server
 */

import assert from "node:assert/strict";
import { resolveMaxBodyBytes, isBodyTooLarge } from "../lib/server/body-limit";
import { resolveRateLimitTier, checkRateLimit } from "../lib/server/rate-limit";
import {
  assertSafeOutboundUrl,
  isSafeOutboundUrl,
} from "../lib/server/ssrf-guard";
import { collectHealthReport } from "../lib/server/health-check";

type Case = {
  name: string;
  fn: () => boolean | Promise<boolean>;
  expect: boolean;
};

function mockRequest(input: {
  pathname: string;
  method?: string;
  contentLength?: string;
  ip?: string;
}) {
  return {
    method: input.method ?? "GET",
    nextUrl: { pathname: input.pathname },
    headers: {
      get(name: string) {
        if (name === "content-length") return input.contentLength ?? null;
        if (name === "x-forwarded-for") return input.ip ?? "127.0.0.1";
        return null;
      },
    },
  } as never;
}

const cases: Case[] = [
  {
    name: "SSRF blocks localhost",
    fn: () => !isSafeOutboundUrl("http://localhost/admin"),
    expect: true,
  },
  {
    name: "SSRF blocks metadata IP",
    fn: () => !isSafeOutboundUrl("http://169.254.169.254/latest/meta-data"),
    expect: true,
  },
  {
    name: "SSRF blocks private RFC1918",
    fn: () => !isSafeOutboundUrl("http://192.168.0.10/internal"),
    expect: true,
  },
  {
    name: "SSRF allows public https URL",
    fn: () => {
      const href = assertSafeOutboundUrl("https://example.com/page");
      return href.startsWith("https://example.com/");
    },
    expect: true,
  },
  {
    name: "Rate limit tier for scrape",
    fn: () => resolveRateLimitTier("/api/scrape", "POST") === "scrape",
    expect: true,
  },
  {
    name: "Rate limit tier for telemetry",
    fn: () =>
      resolveRateLimitTier("/api/analytics/event", "POST") === "telemetry",
    expect: true,
  },
  {
    name: "Rate limit tier skips health",
    fn: () => resolveRateLimitTier("/api/health", "GET") === null,
    expect: true,
  },
  {
    name: "Body limit rejects oversized scrape payload",
    fn: () =>
      isBodyTooLarge(
        mockRequest({
          pathname: "/api/scrape",
          method: "POST",
          contentLength: String(64 * 1024),
        }),
        "/api/scrape"
      ),
    expect: true,
  },
  {
    name: "Body limit allows normal scrape payload",
    fn: () =>
      !isBodyTooLarge(
        mockRequest({
          pathname: "/api/scrape",
          method: "POST",
          contentLength: "512",
        }),
        "/api/scrape"
      ),
    expect: true,
  },
  {
    name: "Scrape body limit is smaller than default",
    fn: () => resolveMaxBodyBytes("/api/scrape") < resolveMaxBodyBytes("/api/beam"),
    expect: true,
  },
  {
    name: "Rate limit eventually triggers for scrape tier",
    fn: () => {
      const request = mockRequest({
        pathname: "/api/scrape",
        method: "POST",
        ip: "203.0.113.55",
      });

      let blocked = false;
      for (let i = 0; i < 40; i += 1) {
        if (checkRateLimit(request, "scrape")) {
          blocked = true;
          break;
        }
      }

      return blocked;
    },
    expect: true,
  },
  {
    name: "Health report includes storage probe",
    fn: async () => {
      const report = await collectHealthReport();
      return typeof report.storage.writable === "boolean";
    },
    expect: true,
  },
];

async function main() {
  let passed = 0;

  for (const testCase of cases) {
    const got = await testCase.fn();
    const ok = got === testCase.expect;

    if (ok) {
      passed += 1;
      console.log(`✓ ${testCase.name}`);
      continue;
    }

    console.error(`✗ ${testCase.name}`);
    console.error(`  expected: ${testCase.expect}`);
    console.error(`  got:      ${got}`);
  }

  console.log(`\n${passed}/${cases.length} passed`);
  assert.equal(passed, cases.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
