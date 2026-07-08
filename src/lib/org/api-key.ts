import { createHash, randomBytes } from "crypto";

export const ORG_API_KEY_PREFIX = "evo_org_";

export function generateOrgApiKey(): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `${ORG_API_KEY_PREFIX}${secret}`;
  const keyPrefix = rawKey.slice(0, Math.min(rawKey.length, 16));
  return {
    rawKey,
    keyPrefix,
    keyHash: hashOrgApiKey(rawKey),
  };
}

export function hashOrgApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey.trim()).digest("hex");
}

export function parseBearerOrgApiKey(
  authorization: string | null,
): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token || !token.startsWith(ORG_API_KEY_PREFIX)) return null;
  return token;
}
