import { eq } from "drizzle-orm";
import {
  db,
  referralsTable,
  candidatesTable,
  rolesTable,
  type ReferralRow,
} from "@workspace/db";

export const MAX_REFERRALS_PER_ROLE = 3;
export const MIN_REFERRER_COMPLETENESS = 80;
export const REJECTION_COOLDOWN_DAYS = 60;

export interface ReferralCandidateInput {
  referrerId: string;
  roleId: string;
  candidateId?: string | null;
  candidateName: string;
  candidateEmail?: string | null;
}

export type ReferralRuleResult = { ok: true } | { ok: false; error: string };

function sameCandidate(r: ReferralRow, input: ReferralCandidateInput): boolean {
  if (input.candidateId && r.candidateId && r.candidateId === input.candidateId)
    return true;
  if (
    input.candidateEmail &&
    r.candidateEmail &&
    r.candidateEmail.trim().toLowerCase() === input.candidateEmail.trim().toLowerCase()
  )
    return true;
  return (
    r.candidateName.trim().toLowerCase() ===
    input.candidateName.trim().toLowerCase()
  );
}

/**
 * Enforce the five referral anti-abuse rules:
 *  1. No self-referral.
 *  2. First-referrer credit: a candidate may only be referred once per role.
 *  3. Max 3 referrals per referrer per role.
 *  4. Referrer profile must be > 80% complete.
 *  5. 60-day cooldown after a candidate is rejected (any role).
 * Roles must also be published to the network to accept referrals.
 */
export async function checkReferralRules(
  input: ReferralCandidateInput,
): Promise<ReferralRuleResult> {
  const [role] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.id, input.roleId));
  if (!role) return { ok: false, error: "Role not found" };
  if (!role.publishedToNetwork)
    return { ok: false, error: "This role is not open to network referrals" };

  // Rule 4 prerequisite: load the referrer's own candidate profile (also used for Rule 1).
  const [referrer] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, input.referrerId));
  if (!referrer) return { ok: false, error: "Referrer profile not found" };

  // Rule 1: no self-referral. Block both known-candidate submissions (by id) and
  // external-candidate submissions (portal path, candidateId is null) by matching
  // the referrer's own profile email or name.
  const isSelf =
    (input.candidateId != null && input.candidateId === input.referrerId) ||
    (input.candidateEmail != null &&
      referrer.email != null &&
      input.candidateEmail.trim().toLowerCase() ===
        referrer.email.trim().toLowerCase()) ||
    referrer.name.trim().toLowerCase() === input.candidateName.trim().toLowerCase();
  if (isSelf) return { ok: false, error: "You cannot refer yourself" };

  // Rule 4: referrer profile completeness.
  if (referrer.profileCompleteness <= MIN_REFERRER_COMPLETENESS)
    return {
      ok: false,
      error: `Complete your profile to at least ${MIN_REFERRER_COMPLETENESS}% before referring (currently ${referrer.profileCompleteness}%)`,
    };

  const existing = await db.select().from(referralsTable);

  // Rule 2: first-referrer credit — one referral per candidate per role.
  const dupForRole = existing.find(
    (r) => r.roleId === input.roleId && sameCandidate(r, input),
  );
  if (dupForRole)
    return {
      ok: false,
      error: "This candidate has already been referred for this role",
    };

  // Rule 3: max referrals per referrer per role.
  const myForRole = existing.filter(
    (r) => r.referrerId === input.referrerId && r.roleId === input.roleId,
  );
  if (myForRole.length >= MAX_REFERRALS_PER_ROLE)
    return {
      ok: false,
      error: `You can submit at most ${MAX_REFERRALS_PER_ROLE} referrals for a single role`,
    };

  // Rule 5: 60-day cooldown after rejection (any role).
  const rejected = existing
    .filter((r) => r.status === "REJECTED" && sameCandidate(r, input))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  if (rejected) {
    const days = (Date.now() - rejected.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days < REJECTION_COOLDOWN_DAYS) {
      const wait = Math.ceil(REJECTION_COOLDOWN_DAYS - days);
      return {
        ok: false,
        error: `This candidate was recently rejected. You can re-refer them in ${wait} day(s)`,
      };
    }
  }

  return { ok: true };
}
