import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

const n = process.env;

/**
 * Resolve the public base URL the frontend is served from, used to build
 * links inside outgoing emails. Prefers an explicit APP_URL, then the first
 * Replit domain, and finally falls back to localhost for local development.
 */
export function appBaseUrl(): string {
  const explicit = n.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const domains = n.REPLIT_DOMAINS?.split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (domains && domains.length > 0) return `https://${domains[0]}`;
  return "http://localhost:5000";
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function smtpConfig(): SmtpConfig | null {
  const host = n.SMTP_HOST?.trim();
  const user = n.SMTP_USER?.trim();
  const pass = n.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  return {
    host,
    port: n.SMTP_PORT ? Number(n.SMTP_PORT) : 587,
    user,
    pass,
    from: n.SMTP_FROM?.trim() || user,
  };
}

let cachedTransport: Transporter | null = null;

function transport(cfg: SmtpConfig): Transporter {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return cachedTransport;
}

interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Deliver a transactional email. When SMTP is configured the message is sent
 * via nodemailer. When it is not configured we log the full message (including
 * any action link) so flows remain testable in development; in production an
 * unconfigured SMTP is a hard error so failures are never silent.
 */
export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  const cfg = smtpConfig();
  if (!cfg) {
    if (n.NODE_ENV === "production") {
      throw new Error(
        "SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS). Cannot send transactional email in production.",
      );
    }
    logger.warn(
      { to: msg.to, subject: msg.subject, body: msg.text },
      "SMTP not configured — logging email instead of sending (development only)",
    );
    return;
  }
  await transport(cfg).sendMail({
    from: cfg.from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
}

function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<p style="margin:24px 0"><a href="${cta.url}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${cta.label}</a></p>
       <p style="color:#64748b;font-size:13px">Or paste this link into your browser:<br><a href="${cta.url}">${cta.url}</a></p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <h2 style="font-size:18px">${title}</h2>
    ${body}
    ${button}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
    <p style="color:#94a3b8;font-size:12px">TalentGraph — Product &amp; Engineering search</p>
  </div>`;
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const url = `${appBaseUrl()}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your TalentGraph email",
    text: `Hi ${name},\n\nConfirm your email address to finish setting up your TalentGraph account:\n${url}\n\nThis link expires in 24 hours.`,
    html: layout(
      "Verify your email",
      `<p>Hi ${name}, confirm your email address to finish setting up your TalentGraph account. This link expires in 24 hours.</p>`,
      { label: "Verify email", url },
    ),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const url = `${appBaseUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Reset your TalentGraph password",
    text: `Hi ${name},\n\nReset your TalentGraph password using the link below:\n${url}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    html: layout(
      "Reset your password",
      `<p>Hi ${name}, reset your TalentGraph password using the button below. This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>`,
      { label: "Reset password", url },
    ),
  });
}

export async function sendInviteEmail(
  to: string,
  name: string,
  companyName: string,
  token: string,
): Promise<void> {
  const url = `${appBaseUrl()}/accept-invite?token=${token}`;
  await sendEmail({
    to,
    subject: `You have been invited to TalentGraph for ${companyName}`,
    text: `Hi ${name},\n\nYou have been invited to access the TalentGraph hiring portal for ${companyName}. Set your password to activate your account:\n${url}\n\nThis link expires in 7 days.`,
    html: layout(
      "You have been invited",
      `<p>Hi ${name}, you have been invited to access the TalentGraph hiring portal for <strong>${companyName}</strong>. Set your password to activate your account. This link expires in 7 days.</p>`,
      { label: "Activate account", url },
    ),
  });
}
