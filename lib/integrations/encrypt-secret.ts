import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { IntegrationSecretPayload } from "@/lib/integrations/types";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function deriveKey(): Buffer {
  const material =
    process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim() ??
    (process.env.NODE_ENV === "development"
      ? "rimvio-dev-integrations-key-change-me"
      : "");

  if (!material) {
    throw new Error("INTEGRATIONS_ENCRYPTION_KEY is required in production.");
  }

  return createHash("sha256").update(material).digest();
}

export function encryptSecretPayload(payload: IntegrationSecretPayload): string {
  const key = deriveKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecretPayload(ciphertext: string): IntegrationSecretPayload {
  const key = deriveKey();
  const buf = Buffer.from(ciphertext, "base64url");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + 16);
  const encrypted = buf.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
  return JSON.parse(plaintext) as IntegrationSecretPayload;
}
