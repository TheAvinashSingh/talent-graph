import type {
  CandidateRow,
  ExperienceRow,
  SkillRow,
  RoleRow,
  ClientRow,
  CandidateScoreRow,
  TrustEdgeRow,
} from "@workspace/db";
import { trustWeight } from "./talent";

export function iso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

export function mapExperience(e: ExperienceRow) {
  return {
    id: e.id,
    company: e.company,
    title: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    promoted: e.promoted,
    description: e.description,
    order: e.order,
  };
}

export function mapSkill(s: SkillRow) {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    proficiency: s.proficiency,
  };
}

export function currentExperience(experiences: ExperienceRow[]) {
  const sorted = [...experiences].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
  return sorted.find((e) => !e.endDate) ?? sorted[0];
}

export function bestScore(scores: CandidateScoreRow[]): number | null {
  if (scores.length === 0) return null;
  return Math.max(...scores.map((s) => s.compositeScore));
}

export function mapCandidateListItem(
  c: CandidateRow,
  experiences: ExperienceRow[],
  skills: SkillRow[],
  scores: CandidateScoreRow[],
) {
  const cur = currentExperience(experiences);
  const topSkills = [...skills]
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 4)
    .map(mapSkill);
  return {
    id: c.id,
    name: c.name,
    avatarUrl: c.avatarUrl,
    location: c.location,
    currentTitle: cur?.title ?? null,
    currentCompany: cur?.company ?? null,
    topSkills,
    status: c.status,
    source: c.source,
    compositeScore: bestScore(scores),
    careerVelocity: c.careerVelocity,
    compensationExpected: c.compensationExpected,
    updatedAt: iso(c.updatedAt),
  };
}

export function mapCandidate(
  c: CandidateRow,
  experiences: ExperienceRow[],
  skills: SkillRow[],
  scoreHistory: {
    score: CandidateScoreRow;
    roleTitle: string;
    clientName: string;
  }[],
) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    location: c.location,
    linkedinUrl: c.linkedinUrl,
    avatarUrl: c.avatarUrl,
    experiences: [...experiences]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .map(mapExperience),
    skills: skills.map(mapSkill),
    arrInfluenced: c.arrInfluenced,
    revenueImpact: c.revenueImpact,
    productsLaunched: c.productsLaunched,
    usersImpacted: c.usersImpacted,
    impactSummary: c.impactSummary,
    teamSize: c.teamSize,
    hiringResponsibility: c.hiringResponsibility,
    budgetOwnership: c.budgetOwnership,
    executiveExposure: c.executiveExposure,
    peopleManaged: c.peopleManaged,
    directReportsCurrently: c.directReportsCurrently,
    compensationCurrent: c.compensationCurrent,
    compensationExpected: c.compensationExpected,
    remotePreference: c.remotePreference,
    relocationOpen: c.relocationOpen,
    industryInterests: c.industryInterests,
    noticePeriod: c.noticePeriod,
    status: c.status,
    source: c.source,
    careerVelocity: c.careerVelocity,
    profileCompleteness: c.profileCompleteness,
    recruiterNotes: c.recruiterNotes,
    scores: scoreHistory.map((sh) => ({
      id: sh.score.id,
      roleId: sh.score.roleId,
      roleTitle: sh.roleTitle,
      clientName: sh.clientName,
      roleFitScore: sh.score.roleFitScore,
      evidenceScore: sh.score.evidenceScore,
      leadershipScore: sh.score.leadershipScore,
      trustScore: sh.score.trustScore,
      evaluationScore: sh.score.evaluationScore,
      compositeScore: sh.score.compositeScore,
      stage: sh.score.stage,
      recruiterNotes: sh.score.recruiterNotes,
      createdAt: iso(sh.score.createdAt),
    })),
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

export function daysOpen(createdAt: Date): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)),
  );
}

export function estimatedFee(r: RoleRow): number {
  const mid = (r.compensationMin + r.compensationMax) / 2;
  return Math.round(mid * (r.feePercentage / 100) * 100) / 100;
}

export function mapRoleListItem(
  r: RoleRow,
  clientName: string,
  pipelineCount: number,
) {
  return {
    id: r.id,
    title: r.title,
    clientId: r.clientId,
    clientName,
    level: r.level,
    department: r.department,
    compensationMin: r.compensationMin,
    compensationMax: r.compensationMax,
    feePercentage: r.feePercentage,
    location: r.location,
    status: r.status,
    daysOpen: daysOpen(r.createdAt),
    pipelineCount,
    publishedToNetwork: r.publishedToNetwork,
  };
}

export function mapRole(
  r: RoleRow,
  clientName: string,
  scores: CandidateScoreRow[],
) {
  const stageCounts = scores.reduce<Record<string, number>>((acc, s) => {
    acc[s.stage] = (acc[s.stage] ?? 0) + 1;
    return acc;
  }, {});
  return {
    id: r.id,
    clientId: r.clientId,
    clientName,
    title: r.title,
    level: r.level,
    department: r.department,
    compensationMin: r.compensationMin,
    compensationMax: r.compensationMax,
    feePercentage: r.feePercentage,
    location: r.location,
    remotePolicy: r.remotePolicy,
    mustHaveSkills: r.mustHaveSkills,
    niceToHaveSkills: r.niceToHaveSkills,
    experienceMin: r.experienceMin,
    experienceMax: r.experienceMax,
    industryPreference: r.industryPreference,
    teamContext: r.teamContext,
    successCriteria: r.successCriteria,
    antiPatterns: r.antiPatterns,
    impactThreshold: r.impactThreshold,
    leadershipSignal: r.leadershipSignal,
    cultureFit: r.cultureFit,
    status: r.status,
    publishedToNetwork: r.publishedToNetwork,
    maxShortlist: r.maxShortlist,
    daysOpen: daysOpen(r.createdAt),
    pipelineCount: scores.length,
    stageCounts: Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count,
    })),
    estimatedFee: estimatedFee(r),
    createdAt: iso(r.createdAt),
  };
}

export function mapScore(s: CandidateScoreRow) {
  return {
    id: s.id,
    candidateId: s.candidateId,
    roleId: s.roleId,
    roleFitScore: s.roleFitScore,
    evidenceScore: s.evidenceScore,
    leadershipScore: s.leadershipScore,
    trustScore: s.trustScore,
    evaluationScore: s.evaluationScore,
    compositeScore: s.compositeScore,
    stage: s.stage,
    recruiterNotes: s.recruiterNotes,
    rejectionReason: s.rejectionReason,
    createdAt: iso(s.createdAt),
  };
}

export function mapTrustEdge(e: TrustEdgeRow) {
  return {
    id: e.id,
    fromCandidateId: e.fromCandidateId,
    toCandidateId: e.toCandidateId,
    relationship: e.relationship,
    strength: e.strength,
    context: e.context,
    trustWeight: trustWeight(e.relationship, e.strength),
  };
}

export function mapClient(c: ClientRow) {
  return {
    id: c.id,
    companyName: c.companyName,
    industry: c.industry,
    size: c.size,
    website: c.website,
    logoUrl: c.logoUrl,
    contactName: c.contactName,
    contactEmail: c.contactEmail,
    contactPhone: c.contactPhone,
    status: c.status,
  };
}
