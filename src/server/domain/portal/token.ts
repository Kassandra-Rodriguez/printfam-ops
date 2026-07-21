import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * docs/security.md #4.2: only a SHA-256 hash of the token is ever persisted.
 * The raw value exists only in the URL sent to the customer and briefly in
 * memory at issuance — callers must not log or store `raw` anywhere else.
 */
export function generatePortalToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashPortalToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const PORTAL_TOKEN_DEFAULT_EXPIRY_DAYS = 14;
