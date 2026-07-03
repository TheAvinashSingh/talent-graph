import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, authTokensTable } from "@workspace/db";

export type AuthTokenType = "VERIFY_EMAIL" | "PASSWORD_RESET" | "INVITE";

export const TOKEN_TTL_MS: Record<AuthTokenType, number> = {
  VERIFY_EMAIL: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
  INVITE: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Create a single-use auth token for a user. Any outstanding unconsumed tokens
 * of the same type are invalidated first so only the newest link works. Returns
 * the raw token (to be emailed); only its hash is persisted.
 */
export async function createAuthToken(
  userId: string,
  type: AuthTokenType,
): Promise<string> {
  await db
    .update(authTokensTable)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(authTokensTable.userId, userId),
        eq(authTokensTable.type, type),
        isNull(authTokensTable.consumedAt),
      ),
    );

  const raw = crypto.randomBytes(32).toString("hex");
  await db.insert(authTokensTable).values({
    userId,
    type,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS[type]),
  });
  return raw;
}

/**
 * Validate and consume a token. Returns the associated userId on success, or
 * null if the token is unknown, of the wrong type, already used, or expired.
 */
export async function consumeAuthToken(
  raw: string,
  type: AuthTokenType,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(authTokensTable)
    .where(
      and(
        eq(authTokensTable.tokenHash, hashToken(raw)),
        eq(authTokensTable.type, type),
      ),
    );
  if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
    return null;
  }
  await db
    .update(authTokensTable)
    .set({ consumedAt: new Date() })
    .where(eq(authTokensTable.id, row.id));
  return row.userId;
}

/**
 * Look up a token without consuming it (used to preview an invite). Returns the
 * userId on success or null when invalid/expired/used.
 */
export async function peekAuthToken(
  raw: string,
  type: AuthTokenType,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(authTokensTable)
    .where(
      and(
        eq(authTokensTable.tokenHash, hashToken(raw)),
        eq(authTokensTable.type, type),
      ),
    );
  if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
    return null;
  }
  return row.userId;
}
