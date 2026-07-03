import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  rolesTable,
  clientsTable,
  candidatesTable,
  referralsTable,
  activityTable,
} from "@workspace/db";
import {
  ListPortalRolesResponse,
  ListMyReferralsResponse,
  CreateMyReferralBody,
  CreateMyReferralResponse,
  GetMyScoutScoreResponse,
} from "@workspace/api-zod";
import { iso } from "../lib/mappers";
import { scoutScore, isTalentScout } from "../lib/talent";
import { checkReferralRules, MAX_REFERRALS_PER_ROLE } from "../lib/referral-rules";

const router: IRouter = Router();

function referrerId(req: { user?: { referrerCandidateId: string | null } }): string | null {
  return req.user?.referrerCandidateId ?? null;
}

function mapReferral(
  r: typeof referralsTable.$inferSelect,
  referrerName: string,
  roleTitle: string,
) {
  return {
    id: r.id,
    referrerId: r.referrerId,
    referrerName,
    candidateId: r.candidateId ?? "",
    candidateName: r.candidateName,
    roleId: r.roleId,
    roleTitle,
    status: r.status,
    rewardAmount: r.rewardAmount,
    rewardPaid: r.rewardPaid,
    note: r.note,
    createdAt: iso(r.createdAt),
  };
}

// Industry-anonymised list of roles open to the referral network.
router.get("/roles", async (req, res): Promise<void> => {
  const me = referrerId(req);
  const roles = await db.select().from(rolesTable);
  const clients = await db.select().from(clientsTable);
  const referrals = me
    ? await db.select().from(referralsTable).where(eq(referralsTable.referrerId, me))
    : [];

  const published = roles
    .filter((r) => r.publishedToNetwork)
    .map((r) => {
      const client = clients.find((c) => c.id === r.clientId);
      const myReferralCount = referrals.filter((ref) => ref.roleId === r.id).length;
      return {
        id: r.id,
        title: r.title,
        level: r.level,
        department: r.department,
        industry: client?.industry ?? "Unknown",
        location: r.location,
        remotePolicy: r.remotePolicy,
        compensationMin: r.compensationMin,
        compensationMax: r.compensationMax,
        experienceMin: r.experienceMin,
        experienceMax: r.experienceMax,
        mustHaveSkills: r.mustHaveSkills,
        niceToHaveSkills: r.niceToHaveSkills,
        myReferralCount,
        referralsRemaining: Math.max(MAX_REFERRALS_PER_ROLE - myReferralCount, 0),
      };
    });

  res.json(ListPortalRolesResponse.parse(published));
});

router.get("/referrals", async (req, res): Promise<void> => {
  const me = referrerId(req);
  if (!me) {
    res.json(ListMyReferralsResponse.parse([]));
    return;
  }
  const rows = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, me));
  const [referrer] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, me));
  const roles = await db.select().from(rolesTable);
  const decorated = rows
    .map((r) =>
      mapReferral(
        r,
        referrer?.name ?? "You",
        roles.find((role) => role.id === r.roleId)?.title ?? "Unknown role",
      ),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(ListMyReferralsResponse.parse(decorated));
});

router.post("/referrals", async (req, res): Promise<void> => {
  const me = referrerId(req);
  if (!me) {
    res.status(403).json({ error: "Your account is not linked to a referrer profile" });
    return;
  }
  const parsed = CreateMyReferralBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;

  const ruleCheck = await checkReferralRules({
    referrerId: me,
    roleId: d.roleId,
    candidateId: null,
    candidateName: d.candidateName,
    candidateEmail: d.candidateEmail ?? null,
  });
  if (!ruleCheck.ok) {
    res.status(400).json({ error: ruleCheck.error });
    return;
  }

  const [created] = await db
    .insert(referralsTable)
    .values({
      referrerId: me,
      roleId: d.roleId,
      candidateName: d.candidateName,
      candidateEmail: d.candidateEmail ?? null,
      candidatePhone: d.candidatePhone ?? null,
      candidateLinkedin: d.candidateLinkedin ?? null,
      note: d.note ?? null,
      status: "SUBMITTED",
    })
    .returning();

  await db.insert(activityTable).values({
    entityType: "REFERRAL",
    entityId: created.id,
    action: "CREATED",
    details: `Network referral submitted for ${created.candidateName}`,
  });

  const [referrer] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, me));
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, d.roleId));
  res.status(201).json(
    CreateMyReferralResponse.parse(
      mapReferral(created, referrer?.name ?? "You", role?.title ?? "Unknown role"),
    ),
  );
});

router.get("/score", async (req, res): Promise<void> => {
  const me = referrerId(req);
  if (!me) {
    res.status(403).json({ error: "Your account is not linked to a referrer profile" });
    return;
  }
  const [referrer] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, me));
  const allReferrals = await db.select().from(referralsTable);
  const mine = allReferrals.filter((r) => r.referrerId === me);
  const roles = await db.select().from(rolesTable);

  const submitted = mine.length;
  const shortlisted = mine.filter((r) =>
    ["SHORTLISTED", "INTERVIEWED", "HIRED"].includes(r.status),
  ).length;
  const interviewed = mine.filter((r) => ["INTERVIEWED", "HIRED"].includes(r.status)).length;
  const hired = mine.filter((r) => r.status === "HIRED").length;
  const score = scoutScore({ submitted, shortlisted, interviewed, hired });

  // Rank against all referrers by scout score.
  const byReferrer = new Map<string, typeof allReferrals>();
  for (const r of allReferrals) {
    const arr = byReferrer.get(r.referrerId) ?? [];
    arr.push(r);
    byReferrer.set(r.referrerId, arr);
  }
  const ranked = [...byReferrer.entries()]
    .map(([id, rs]) => ({
      id,
      score: scoutScore({
        submitted: rs.length,
        shortlisted: rs.filter((r) =>
          ["SHORTLISTED", "INTERVIEWED", "HIRED"].includes(r.status),
        ).length,
        interviewed: rs.filter((r) => ["INTERVIEWED", "HIRED"].includes(r.status)).length,
        hired: rs.filter((r) => r.status === "HIRED").length,
      }),
    }))
    .sort((a, b) => b.score - a.score);
  const rankIndex = ranked.findIndex((e) => e.id === me);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  const recentReferrals = mine
    .map((r) =>
      mapReferral(
        r,
        referrer?.name ?? "You",
        roles.find((role) => role.id === r.roleId)?.title ?? "Unknown role",
      ),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  res.json(
    GetMyScoutScoreResponse.parse({
      referrerId: me,
      name: referrer?.name ?? "You",
      avatarUrl: referrer?.avatarUrl ?? null,
      scoutScore: score,
      submitted,
      shortlisted,
      interviewed,
      hired,
      successRate: submitted ? Math.round((hired / submitted) * 1000) / 10 : 0,
      isTalentScout: isTalentScout(score, submitted, hired),
      profileCompleteness: referrer?.profileCompleteness ?? 0,
      rank,
      recentReferrals,
    }),
  );
});

export default router;
