import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  candidatesTable,
  clientsTable,
  clientUsersTable,
  activityTable,
} from "@workspace/db";
import {
  RegisterUserBody,
  RegisterUserResponse,
  LoginUserBody,
  LoginUserResponse,
  GetMeResponse,
  VerifyEmailBody,
  VerifyEmailResponse,
  ResendVerificationResponse,
  RequestPasswordResetBody,
  RequestPasswordResetResponse,
  ResetPasswordBody,
  ResetPasswordResponse,
  GetInviteParams,
  GetInviteResponse,
  AcceptInviteBody,
  AcceptInviteResponse,
} from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  setAuthCookie,
  clearAuthCookie,
  toAuthUser,
  requireAuth,
} from "../lib/auth";
import { computeProfileCompleteness } from "../lib/talent";
import {
  createAuthToken,
  consumeAuthToken,
  peekAuthToken,
} from "../lib/tokens";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../lib/email";

const router: IRouter = Router();

router.post("/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password } = parsed.data;
  const role = "REFERRER" as const;
  const normalizedEmail = email.trim().toLowerCase();

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const completeness = computeProfileCompleteness({
    email: normalizedEmail,
    phone: null,
    location: null,
    linkedinUrl: null,
    impactSummary: null,
    compensationExpected: null,
    experienceCount: 0,
    skillCount: 0,
  });
  const [candidate] = await db
    .insert(candidatesTable)
    .values({
      name,
      email: normalizedEmail,
      source: "COMMUNITY",
      status: "NOT_LOOKING",
      profileCompleteness: completeness,
    })
    .returning();
  const referrerCandidateId = candidate.id;

  const [user] = await db
    .insert(usersTable)
    .values({ name, email: normalizedEmail, passwordHash, role, referrerCandidateId })
    .returning();

  await db.insert(activityTable).values({
    entityType: "USER",
    entityId: user.id,
    action: "REGISTERED",
    details: `${role} account created for ${name}`,
  });

  const verifyToken = await createAuthToken(user.id, "VERIFY_EMAIL");
  try {
    await sendVerificationEmail(user.email, user.name, verifyToken);
  } catch (err) {
    req.log.error({ err }, "Failed to send verification email");
  }

  setAuthCookie(res, user.id);
  res.status(201).json(RegisterUserResponse.parse(await toAuthUser(user)));
});

router.post("/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  setAuthCookie(res, user.id);
  res.json(LoginUserResponse.parse(await toAuthUser(user)));
});

router.post("/logout", (_req, res): void => {
  clearAuthCookie(res);
  res.sendStatus(204);
});

router.get("/me", requireAuth, (req, res): void => {
  res.json(GetMeResponse.parse(req.user));
});

router.post("/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = await consumeAuthToken(parsed.data.token, "VERIFY_EMAIL");
  if (!userId) {
    res.status(400).json({ error: "This verification link is invalid or has expired" });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set({ emailVerified: true })
    .where(eq(usersTable.id, userId))
    .returning();
  if (!user) {
    res.status(400).json({ error: "Account no longer exists" });
    return;
  }
  setAuthCookie(res, user.id);
  res.json(VerifyEmailResponse.parse(await toAuthUser(user)));
});

router.post("/resend-verification", requireAuth, async (req, res): Promise<void> => {
  const current = req.user!;
  if (current.emailVerified) {
    res.json(ResendVerificationResponse.parse({ message: "Your email is already verified" }));
    return;
  }
  const token = await createAuthToken(current.id, "VERIFY_EMAIL");
  try {
    await sendVerificationEmail(current.email, current.name, token);
  } catch (err) {
    req.log.error({ err }, "Failed to resend verification email");
    res.status(502).json({ error: "Could not send the verification email. Please try again later." });
    return;
  }
  res.json(ResendVerificationResponse.parse({ message: "Verification email sent" }));
});

router.post("/request-password-reset", async (req, res): Promise<void> => {
  const parsed = RequestPasswordResetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));
  // Always respond the same way so the endpoint cannot be used to probe which
  // emails have accounts.
  if (user) {
    const token = await createAuthToken(user.id, "PASSWORD_RESET");
    try {
      await sendPasswordResetEmail(user.email, user.name, token);
    } catch (err) {
      req.log.error({ err }, "Failed to send password reset email");
    }
  }
  res.json(
    RequestPasswordResetResponse.parse({
      message: "If an account exists for that email, a reset link has been sent",
    }),
  );
});

router.post("/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const userId = await consumeAuthToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) {
    res.status(400).json({ error: "This reset link is invalid or has expired" });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  // Resetting a password also confirms control of the inbox, so verify the email.
  await db
    .update(usersTable)
    .set({ passwordHash, emailVerified: true })
    .where(eq(usersTable.id, userId));
  res.json(ResetPasswordResponse.parse({ message: "Your password has been updated" }));
});

router.get("/invite/:token", async (req, res): Promise<void> => {
  const parsed = GetInviteParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = await peekAuthToken(parsed.data.token, "INVITE");
  if (!userId) {
    res.status(400).json({ error: "This invitation is invalid or has expired" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(400).json({ error: "This invitation is no longer valid" });
    return;
  }
  const [link] = await db
    .select()
    .from(clientUsersTable)
    .where(eq(clientUsersTable.userId, user.id));
  let companyName = "";
  if (link) {
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, link.clientId));
    companyName = client?.companyName ?? "";
  }
  res.json(
    GetInviteResponse.parse({ email: user.email, name: user.name, companyName }),
  );
});

router.post("/accept-invite", async (req, res): Promise<void> => {
  const parsed = AcceptInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const userId = await consumeAuthToken(parsed.data.token, "INVITE");
  if (!userId) {
    res.status(400).json({ error: "This invitation is invalid or has expired" });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .update(usersTable)
    .set({ passwordHash, emailVerified: true })
    .where(eq(usersTable.id, userId))
    .returning();
  if (!user) {
    res.status(400).json({ error: "This invitation is no longer valid" });
    return;
  }
  await db.insert(activityTable).values({
    entityType: "USER",
    entityId: user.id,
    action: "INVITE_ACCEPTED",
    details: `${user.name} activated their account`,
  });
  setAuthCookie(res, user.id);
  res.json(AcceptInviteResponse.parse(await toAuthUser(user)));
});

export default router;
