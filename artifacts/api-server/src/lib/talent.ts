export const TRUST_WEIGHTS: Record<string, number> = {
  REFERRED: 3,
  WORKED_WITH: 2,
  MANAGED: 4,
  MANAGED_BY: 4,
  WOULD_HIRE_AGAIN: 5,
};

export const PIPELINE_STAGES = [
  "SOURCED",
  "SCREENED",
  "EVALUATED",
  "SHORTLISTED",
  "INTERVIEWING",
  "OFFERED",
  "PLACED",
  "REJECTED",
] as const;

export function trustWeight(relationship: string, strength: number): number {
  const base = TRUST_WEIGHTS[relationship] ?? 1;
  return base * (strength || 1);
}

export function computeComposite(s: {
  roleFitScore: number;
  evidenceScore: number;
  leadershipScore: number;
  trustScore: number;
  evaluationScore: number;
}): number {
  const composite =
    s.roleFitScore * 0.4 +
    s.evidenceScore * 0.25 +
    s.leadershipScore * 0.15 +
    s.trustScore * 0.1 +
    s.evaluationScore * 0.1;
  return Math.round(composite * 10) / 10;
}

export function computeCareerVelocity(
  experiences: { startDate: string; endDate: string | null; promoted: boolean }[],
): number {
  if (experiences.length === 0) return 0;
  const promotions = experiences.filter((e) => e.promoted).length;
  const earliest = experiences
    .map((e) => new Date(e.startDate).getTime())
    .reduce((a, b) => Math.min(a, b), Date.now());
  const years = Math.max((Date.now() - earliest) / (1000 * 60 * 60 * 24 * 365), 1);
  const moves = experiences.length;
  return Math.round(((promotions * 2 + moves) / years) * 10) / 10;
}

export function computeProfileCompleteness(c: {
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  impactSummary: string | null;
  compensationExpected: number | null;
  experienceCount: number;
  skillCount: number;
}): number {
  const checks = [
    !!c.email,
    !!c.phone,
    !!c.location,
    !!c.linkedinUrl,
    !!c.impactSummary,
    c.compensationExpected != null,
    c.experienceCount > 0,
    c.skillCount > 0,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export function quarterStart(d = new Date()): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

export function scoutScore(stats: {
  submitted: number;
  shortlisted: number;
  interviewed: number;
  hired: number;
}): number {
  const raw =
    stats.submitted * 1 +
    stats.shortlisted * 3 +
    stats.interviewed * 5 +
    stats.hired * 10;
  const successMultiplier = Math.max(
    stats.submitted > 0 ? stats.hired / stats.submitted : 0,
    0.1,
  );
  return Math.round(raw * successMultiplier * 10) / 10;
}

/**
 * A referrer earns "TalentScout" status with a scout score above 8.0,
 * at least 5 total referrals, and at least 2 hires.
 */
export function isTalentScout(
  score: number,
  totalReferrals: number,
  hired: number,
): boolean {
  return score > 8.0 && totalReferrals >= 5 && hired >= 2;
}
