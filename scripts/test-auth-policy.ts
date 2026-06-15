import assert from "node:assert/strict";
import {
  buildLoginRedirectUrl,
  isAuthRequired,
  isPublicApiPath,
  isPublicPagePath,
  isPublicPath,
} from "../lib/auth/policy";
import {
  isAuthGateBypass,
  isProtectedRoute,
  normalizeProtectedPath,
  PROTECTED_ROUTES,
} from "../lib/auth/protected-routes";

process.env.AUTH_REQUIRED = "true";
assert.equal(isAuthRequired(), true);

assert.ok(isProtectedRoute("/feed"));
assert.ok(isProtectedRoute("/now"));
assert.ok(isProtectedRoute("/calendar"));
assert.ok(isProtectedRoute("/chat"));
assert.ok(isProtectedRoute("/stack"));
assert.ok(isProtectedRoute("/inbox"));
assert.ok(isProtectedRoute("/"));
assert.ok(!isProtectedRoute("/welcome"));
assert.equal(normalizeProtectedPath("/"), "/feed");

assert.ok(isAuthGateBypass("/auth/callback"));
assert.ok(!isAuthGateBypass("/feed"));

assert.ok(isPublicPagePath("/auth/callback"));
assert.ok(!isPublicPagePath("/feed"));

assert.ok(isPublicApiPath("/api/health"));
assert.ok(isPublicApiPath("/api/globe/tile"));
assert.ok(!isPublicApiPath("/api/scrape"));
assert.ok(!isPublicPath("/feed", "GET"));

assert.equal(PROTECTED_ROUTES.length, 6);

const login = buildLoginRedirectUrl(
  new URL("http://localhost:3000/now?tab=1"),
);
assert.equal(login.pathname, "/feed");
assert.equal(login.searchParams.get("next"), "/now?tab=1");

console.log("test-auth-policy: ok");
