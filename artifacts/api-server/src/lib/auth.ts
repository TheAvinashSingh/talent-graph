import type { Request, Response, NextFunction, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  clientUsersTable,
  clientsTable,
  type UserRow,
} from "@workspace/db";

const COOKIE_NAME = "tg_token";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Role = "ADMIN" | "CLIENT" | "REFERRER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  referrerCandidateId: string | null;
  clientId: string | null;
  clientName: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error("SESSION_SECRET must be set for authentication");
  }
  return s;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setAuthCookie(res: Response, userId: string): void {
  const token = jwt.sign({ sub: userId }, secret(), {
    expiresIn: TOKEN_TTL_SECONDS,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

/** Build the public AuthUser shape, resolving client linkage when needed. */
export async function toAuthUser(user: UserRow): Promise<AuthUser> {
  let clientId: string | null = null;
  let clientName: string | null = null;
  if (user.role === "CLIENT") {
    const [link] = await db
      .select()
      .from(clientUsersTable)
      .where(eq(clientUsersTable.userId, user.id));
    if (link) {
      clientId = link.clientId;
      const [client] = await db
        .select()
        .from(clientsTable)
        .where(eq(clientsTable.id, link.clientId));
      clientName = client?.companyName ?? null;
    }
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    emailVerified: user.emailVerified,
    referrerCandidateId: user.referrerCandidateId ?? null,
    clientId,
    clientName,
  };
}

function readToken(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[
    COOKIE_NAME
  ];
  if (fromCookie) return fromCookie;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  let userId: string;
  try {
    const payload = jwt.verify(token, secret()) as { sub?: string };
    if (!payload.sub) throw new Error("Missing subject");
    userId = payload.sub;
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Account no longer exists" });
    return;
  }
  req.user = await toAuthUser(user);
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "You do not have access to this resource" });
      return;
    }
    next();
  };
}
