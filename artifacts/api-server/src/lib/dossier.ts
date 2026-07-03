import { eq, inArray } from "drizzle-orm";
import {
  db,
  candidatesTable,
  experiencesTable,
  skillsTable,
  candidateScoresTable,
  rolesTable,
  clientsTable,
  trustEdgesTable,
} from "@workspace/db";
import { mapCandidate, mapTrustEdge, currentExperience, iso } from "./mappers";

export async function loadCandidateBundle(id: string) {
  const [c] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, id));
  if (!c) return null;
  const experiences = await db
    .select()
    .from(experiencesTable)
    .where(eq(experiencesTable.candidateId, id));
  const skills = await db.select().from(skillsTable).where(eq(skillsTable.candidateId, id));
  const scores = await db
    .select()
    .from(candidateScoresTable)
    .where(eq(candidateScoresTable.candidateId, id));
  return { c, experiences, skills, scores };
}

export type DossierResult =
  | { ok: false; status: number; error: string }
  | { ok: true; payload: Record<string, unknown> };

/** Build the full candidate dossier payload for a candidate + role pair. */
export async function buildDossier(
  candidateId: string,
  roleId: string,
): Promise<DossierResult> {
  const bundle = await loadCandidateBundle(candidateId);
  if (!bundle) return { ok: false, status: 404, error: "Candidate not found" };

  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId));
  if (!role) return { ok: false, status: 404, error: "Role not found" };

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, role.clientId));
  const roleScore = bundle.scores.find((s) => s.roleId === roleId) ?? null;

  const cur = currentExperience(bundle.experiences);
  const summaryParts = [
    `${bundle.c.name} is a ${cur?.title ?? "leader"}${cur?.company ? ` at ${cur.company}` : ""}`,
    bundle.c.impactSummary,
    bundle.c.arrInfluenced
      ? `Has influenced approximately ₹${bundle.c.arrInfluenced} Cr in ARR.`
      : null,
    bundle.c.peopleManaged
      ? `Has managed teams of up to ${bundle.c.peopleManaged} people.`
      : null,
    `Strong alignment with the ${role.title} mandate at ${client?.companyName ?? "the client"}.`,
  ].filter(Boolean);

  const edges = await db.select().from(trustEdgesTable);
  const related = edges.filter(
    (e) => e.toCandidateId === candidateId || e.fromCandidateId === candidateId,
  );
  const endorserIds = [
    ...new Set(
      related
        .filter(
          (e) =>
            e.toCandidateId === candidateId &&
            ["WOULD_HIRE_AGAIN", "MANAGED_BY", "REFERRED"].includes(e.relationship),
        )
        .map((e) => e.fromCandidateId),
    ),
  ];
  const endorserCandidates = endorserIds.length
    ? await db.select().from(candidatesTable).where(inArray(candidatesTable.id, endorserIds))
    : [];
  const allExp = await db.select().from(experiencesTable);
  const endorsers = endorserCandidates.map((c) => {
    const ec = currentExperience(allExp.filter((e) => e.candidateId === c.id));
    return {
      id: c.id,
      name: c.name,
      currentTitle: ec?.title ?? null,
      currentCompany: ec?.company ?? null,
      avatarUrl: c.avatarUrl,
      status: c.status,
      compositeScore: null,
      edgeCount: 0,
    };
  });

  const mappedCandidate = mapCandidate(bundle.c, bundle.experiences, bundle.skills, []);
  const mappedRole = {
    id: role.id,
    clientId: role.clientId,
    clientName: client?.companyName ?? "Unknown",
    title: role.title,
    level: role.level,
    department: role.department,
    compensationMin: role.compensationMin,
    compensationMax: role.compensationMax,
    feePercentage: role.feePercentage,
    location: role.location,
    remotePolicy: role.remotePolicy,
    mustHaveSkills: role.mustHaveSkills,
    niceToHaveSkills: role.niceToHaveSkills,
    experienceMin: role.experienceMin,
    experienceMax: role.experienceMax,
    industryPreference: role.industryPreference,
    teamContext: role.teamContext,
    successCriteria: role.successCriteria,
    antiPatterns: role.antiPatterns,
    impactThreshold: role.impactThreshold,
    leadershipSignal: role.leadershipSignal,
    cultureFit: role.cultureFit,
    status: role.status,
    publishedToNetwork: role.publishedToNetwork,
    maxShortlist: role.maxShortlist,
    daysOpen: 0,
    pipelineCount: 0,
    stageCounts: [],
    estimatedFee: 0,
    createdAt: iso(role.createdAt),
  };

  const score = roleScore
    ? {
        id: roleScore.id,
        candidateId: roleScore.candidateId,
        roleId: roleScore.roleId,
        roleFitScore: roleScore.roleFitScore,
        evidenceScore: roleScore.evidenceScore,
        leadershipScore: roleScore.leadershipScore,
        trustScore: roleScore.trustScore,
        evaluationScore: roleScore.evaluationScore,
        compositeScore: roleScore.compositeScore,
        stage: roleScore.stage,
        recruiterNotes: roleScore.recruiterNotes,
        rejectionReason: roleScore.rejectionReason,
        createdAt: iso(roleScore.createdAt),
      }
    : {
        id: "",
        candidateId,
        roleId,
        roleFitScore: 0,
        evidenceScore: 0,
        leadershipScore: 0,
        trustScore: 0,
        evaluationScore: 0,
        compositeScore: 0,
        stage: "SOURCED",
        recruiterNotes: null,
        rejectionReason: null,
        createdAt: iso(new Date()),
      };

  return {
    ok: true,
    payload: {
      candidate: mappedCandidate,
      role: mappedRole,
      score,
      professionalSummary: summaryParts.join(" "),
      trustIndicators: related.map(mapTrustEdge),
      endorsers,
    },
  };
}
