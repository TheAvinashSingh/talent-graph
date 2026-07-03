import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import {
  db,
  rolesTable,
  candidateScoresTable,
  placementsTable,
  candidatesTable,
  referralsTable,
  activityTable,
} from "@workspace/db";
import {
  GetDashboardResponse,
  ListActivityResponse,
  GetRevenueAnalyticsResponse,
  GetPipelineAnalyticsResponse,
  GetSourceAnalyticsResponse,
  GetReferralAnalyticsResponse,
} from "@workspace/api-zod";
import { PIPELINE_STAGES, quarterStart, scoutScore } from "../lib/talent";

const router: IRouter = Router();

const FUNNEL_STAGES = [
  "SOURCED",
  "SCREENED",
  "EVALUATED",
  "SHORTLISTED",
  "INTERVIEWING",
  "OFFERED",
  "PLACED",
];

function buildFunnel(scores: { stage: string }[]) {
  const counts = FUNNEL_STAGES.map((stage) => ({
    stage,
    count: scores.filter((s) => s.stage === stage).length,
  }));
  return counts.map((c, i) => ({
    stage: c.stage,
    count: c.count,
    conversionRate:
      i === 0 || counts[i - 1].count === 0
        ? null
        : Math.round((c.count / counts[i - 1].count) * 1000) / 10,
  }));
}

function monthKey(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function lastSixMonths(): { key: string; year: number; month: number }[] {
  const out: { key: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: monthKey(d), year: d.getFullYear(), month: d.getMonth() });
  }
  return out;
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const roles = await db.select().from(rolesTable);
  const scores = await db.select().from(candidateScoresTable);
  const placements = await db.select().from(placementsTable);
  const recent = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(12);

  const qStart = quarterStart();
  const placementsThisQuarter = placements.filter(
    (p) => new Date(p.createdAt) >= qStart,
  );
  const revenueThisQuarter = placementsThisQuarter.reduce((s, p) => s + p.feeAmount, 0);

  const months = lastSixMonths();
  const target = 5;
  const revenueByMonth = months.map((m) => {
    const revenue = placements
      .filter((p) => {
        const d = new Date(p.createdAt);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((s, p) => s + p.feeAmount, 0);
    return { month: m.key, revenue: Math.round(revenue * 100) / 100, target };
  });

  res.json(
    GetDashboardResponse.parse({
      activeRoles: roles.filter((r) => !["PLACED", "CANCELLED"].includes(r.status)).length,
      candidatesInPipeline: new Set(
        scores.filter((s) => !["PLACED", "REJECTED"].includes(s.stage)).map((s) => s.candidateId),
      ).size,
      placementsThisQuarter: placementsThisQuarter.length,
      revenueThisQuarter: Math.round(revenueThisQuarter * 100) / 100,
      revenueTarget: 15,
      funnel: buildFunnel(scores),
      revenueByMonth,
      recentActivity: recent.map((a) => ({
        id: a.id,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
      })),
    }),
  );
});

router.get("/activity", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(50);
  res.json(
    ListActivityResponse.parse(
      rows.map((a) => ({
        id: a.id,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
      })),
    ),
  );
});

router.get("/analytics/revenue", async (_req, res): Promise<void> => {
  const placements = await db.select().from(placementsTable);
  const months = lastSixMonths();
  const target = 5;
  const byMonth = months.map((m) => {
    const revenue = placements
      .filter((p) => {
        const d = new Date(p.createdAt);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((s, p) => s + p.feeAmount, 0);
    return { month: m.key, revenue: Math.round(revenue * 100) / 100, target };
  });
  const totalRevenue = placements.reduce((s, p) => s + p.feeAmount, 0);
  const avgFee = placements.length ? totalRevenue / placements.length : 0;
  const estimatedVsActual = byMonth.map((m) => ({
    label: m.month,
    estimated: m.target,
    actual: m.revenue,
  }));
  res.json(
    GetRevenueAnalyticsResponse.parse({
      byMonth,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgFee: Math.round(avgFee * 100) / 100,
      estimatedVsActual,
    }),
  );
});

router.get("/analytics/pipeline", async (_req, res): Promise<void> => {
  const scores = await db.select().from(candidateScoresTable);
  const funnel = buildFunnel(scores);
  let bottleneckStage: string | null = null;
  let worst = Infinity;
  for (const f of funnel) {
    if (f.conversionRate != null && f.conversionRate < worst) {
      worst = f.conversionRate;
      bottleneckStage = f.stage;
    }
  }
  res.json(GetPipelineAnalyticsResponse.parse({ funnel, bottleneckStage }));
});

router.get("/analytics/sources", async (_req, res): Promise<void> => {
  const candidates = await db.select().from(candidatesTable);
  const placements = await db.select().from(placementsTable);
  const placedIds = new Set(placements.map((p) => p.candidateId));
  const sources = ["DIRECT_SEARCH", "REFERRAL", "COMMUNITY", "INBOUND"];
  const bySource = sources.map((source) => {
    const inSource = candidates.filter((c) => c.source === source);
    const hires = inSource.filter((c) => placedIds.has(c.id)).length;
    return {
      source,
      count: inSource.length,
      hires,
      conversionRate: inSource.length ? Math.round((hires / inSource.length) * 1000) / 10 : 0,
    };
  });
  res.json(GetSourceAnalyticsResponse.parse({ bySource }));
});

router.get("/analytics/referrals", async (_req, res): Promise<void> => {
  const referrals = await db.select().from(referralsTable);
  const referrerIds = new Set(referrals.map((r) => r.referrerId));
  const activeReferrerIds = new Set(
    referrals.filter((r) => !["HIRED", "REJECTED"].includes(r.status)).map((r) => r.referrerId),
  );
  const hired = referrals.filter((r) => r.status === "HIRED").length;

  const byReferrer = new Map<string, typeof referrals>();
  for (const r of referrals) {
    const arr = byReferrer.get(r.referrerId) ?? [];
    arr.push(r);
    byReferrer.set(r.referrerId, arr);
  }
  const scores = [...byReferrer.values()].map((rs) =>
    scoutScore({
      submitted: rs.length,
      shortlisted: rs.filter((r) => ["SHORTLISTED", "INTERVIEWED", "HIRED"].includes(r.status)).length,
      interviewed: rs.filter((r) => ["INTERVIEWED", "HIRED"].includes(r.status)).length,
      hired: rs.filter((r) => r.status === "HIRED").length,
    }),
  );
  const avgScoutScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const statusMap: Record<string, string> = {
    SUBMITTED: "SOURCED",
    SCREENING: "SCREENED",
    SHORTLISTED: "SHORTLISTED",
    INTERVIEWED: "INTERVIEWING",
    HIRED: "PLACED",
  };
  const funnelStages = ["SOURCED", "SCREENED", "SHORTLISTED", "INTERVIEWING", "PLACED"];
  const mapped = referrals
    .filter((r) => r.status !== "REJECTED")
    .map((r) => ({ stage: statusMap[r.status] ?? "SOURCED" }));
  const funnel = funnelStages.map((stage, i) => {
    const count = mapped.filter((m) => {
      const order = funnelStages.indexOf(m.stage);
      return order >= i;
    }).length;
    return { stage, count, conversionRate: null as number | null };
  });

  res.json(
    GetReferralAnalyticsResponse.parse({
      totalReferrers: referrerIds.size,
      activeReferrers: activeReferrerIds.size,
      referralToHireRate: referrals.length ? Math.round((hired / referrals.length) * 1000) / 10 : 0,
      avgScoutScore: Math.round(avgScoutScore * 10) / 10,
      funnel,
    }),
  );
});

export default router;
