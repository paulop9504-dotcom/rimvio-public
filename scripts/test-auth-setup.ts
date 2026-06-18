import assert from "node:assert/strict";
import { getAuthCallbackUrl } from "../lib/auth/redirect-url";
import {
  getAuthCallbackPath,
  googleOAuthRedirectUriForSupabase,
  missingSupabaseEnvKeys,
} from "../lib/auth/setup";

const missing = missingSupabaseEnvKeys();
assert.ok(missing.includes("NEXT_PUBLIC_SUPABASE_URL"));
assert.ok(missing.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
assert.equal(
  getAuthCallbackUrl(),
  "http://localhost:3000/auth/callback",
);
assert.equal(getAuthCallbackPath("/"), "/auth/callback?next=%2F");

assert.equal(
  googleOAuthRedirectUriForSupabase("https://abcd.supabase.co"),
  "https://abcd.supabase.co/auth/v1/callback",
);

console.log("test-auth-setup: ok");
