import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  referralsTable,
  candidatesTable,
  rolesTable,
  activityTable,
} from "@workspace/db";
import {
  ListReferralsResponse,
  CreateReferralBody,
  CreateReferralResponse,
  UpdateReferralParams,
  UpdateReferralBody,
  UpdateReferralResponse,
  GetLeaderboardResponse,
} from "@workspace/api-zod";
import { scoutScore, isTalentScout } from "../lib/talent";
import { checkReferralRules } from "../lib/referral-rules";

const router: IRouter = Router();

async function decorate(rows: (typeof referralsTable.$inferSelect)[]) {
  const candidates = await db.select().from(candidatesTable);
  const roles = await db.select().from(rolesTable);
  return rows.map((r) => {
    const referrer = candidates.find((c) => c.id === r.referrerId);
    const role = roles.find((ro) => ro.id === r.roleId);
    return {
      id: r.id,
      referrerId: r.referrerId,
      referrerName: referrer?.name ?? "Unknown",
      candidateId: r.candidateId ?? "",
      candidateName: r.candidateName,
      roleId: r.roleId,
      roleTitle: role?.title ?? "Unknown",
      status: r.status,
      rewardAmount: r.rewardAmount,
      rewardPaid: r.rewardPaid,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

router.get("/referrals", async (req, res): Promise<void> => {
  let rows = await db.select().from(referralsTable);
  if (typeof req.query.referrerId === "string")
    rows = rows.filter((r) => r.referrerId === req.query.referrerId);
  if (typeof req.query.status === "string")
    rows = rows.filter((r) => r.status === req.query.status);
  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(ListReferralsResponse.parse(await decorate(rows)));
});

router.post("/referrals", async (req, res): Promise<void> => {
  const parsed = CreateReferralBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;

  const ruleCheck = await checkReferralRules({
    referrerId: d.referrerId,
    roleId: d.roleId,
    candidateId: d.candidateId ?? null,
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
      referrerId: d.referrerId,
      roleId: d.roleId,
      candidateId: d.candidateId ?? null,
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
    details: `Referral submitted for ${created.candidateName}`,
  });

  const [decorated] = await decorate([created]);
  res.status(201).json(CreateReferralResponse.parse(decorated));
});

router.put("/referrals/:id", async (req, res): Promise<void> => {
  const params = UpdateReferralParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReferralBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(referralsTable)
    .set({
      status: parsed.data.status,
      rewardAmount: parsed.data.rewardAmount ?? undefined,
      rewardPaid: parsed.data.rewardPaid ?? undefined,
    })
    .where(eq(referralsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Referral not found" });
    return;
  }
  await db.insert(activityTable).values({
    entityType: "REFERRAL",
    entityId: updated.id,
    action: "STATUS_CHANGED",
    details: `Referral for ${updated.candidateName} moved to ${updated.status}`,
  });
  const [decorated] = await decorate([updated]);
  res.json(UpdateReferralResponse.parse(decorated));
});

router.get("/referrals/leaderboard", async (_req, res): Promise<void> => {
  const referrals = await db.select().from(referralsTable);
  const candidates = await db.select().from(candidatesTable);

  const byReferrer = new Map<string, typeof referrals>();
  for (const r of referrals) {
    const arr = byReferrer.get(r.referrerId) ?? [];
    arr.push(r);
    byReferrer.set(r.referrerId, arr);
  }

  const entries = [...byReferrer.entries()].map(([referrerId, rs]) => {
    const submitted = rs.length;
    const shortlisted = rs.filter((r) =>
      ["SHORTLISTED", "INTERVIEWED", "HIRED"].includes(r.status),
    ).length;
    const interviewed = rs.filter((r) => ["INTERVIEWED", "HIRED"].includes(r.status)).length;
    const hired = rs.filter((r) => r.status === "HIRED").length;
    const referrer = candidates.find((c) => c.id === referrerId);
    const score = scoutScore({ submitted, shortlisted, interviewed, hired });
    return {
      referrerId,
      name: referrer?.name ?? "Unknown",
      avatarUrl: referrer?.avatarUrl ?? null,
      scoutScore: score,
      submitted,
      shortlisted,
      interviewed,
      hired,
      successRate: submitted ? Math.round((hired / submitted) * 1000) / 10 : 0,
      isTalentScout: isTalentScout(score, submitted, hired),
    };
  });

  entries.sort((a, b) => b.scoutScore - a.scoutScore);
  res.json(GetLeaderboardResponse.parse(entries));
});

export default router;
