import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  candidateScoresTable,
  candidatesTable,
  rolesTable,
  activityTable,
} from "@workspace/db";
import {
  UpsertScoreBody,
  UpsertScoreResponse,
  UpdateScoreStageParams,
  UpdateScoreStageBody,
  UpdateScoreStageResponse,
} from "@workspace/api-zod";
import { mapScore } from "../lib/mappers";
import { computeComposite, PIPELINE_STAGES } from "../lib/talent";

const router: IRouter = Router();

router.post("/scores", async (req, res): Promise<void> => {
  const parsed = UpsertScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const dims = {
    roleFitScore: d.roleFitScore ?? 0,
    evidenceScore: d.evidenceScore ?? 0,
    leadershipScore: d.leadershipScore ?? 0,
    trustScore: d.trustScore ?? 0,
    evaluationScore: d.evaluationScore ?? 0,
  };
  const compositeScore = computeComposite(dims);

  const [existing] = await db
    .select()
    .from(candidateScoresTable)
    .where(
      and(
        eq(candidateScoresTable.candidateId, d.candidateId),
        eq(candidateScoresTable.roleId, d.roleId),
      ),
    );

  let score;
  if (existing) {
    [score] = await db
      .update(candidateScoresTable)
      .set({
        ...dims,
        compositeScore,
        stage: d.stage ?? existing.stage,
        recruiterNotes: d.recruiterNotes ?? existing.recruiterNotes,
      })
      .where(eq(candidateScoresTable.id, existing.id))
      .returning();
  } else {
    [score] = await db
      .insert(candidateScoresTable)
      .values({
        candidateId: d.candidateId,
        roleId: d.roleId,
        ...dims,
        compositeScore,
        stage: d.stage ?? "SOURCED",
        recruiterNotes: d.recruiterNotes ?? null,
      })
      .returning();
  }

  const [cand] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, d.candidateId));
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, d.roleId));
  await db.insert(activityTable).values({
    entityType: "SCORE",
    entityId: score.id,
    action: existing ? "UPDATED" : "CREATED",
    details: `Scored ${cand?.name ?? "candidate"} (${compositeScore}) for ${role?.title ?? "role"}`,
  });

  res.json(UpsertScoreResponse.parse(mapScore(score)));
});

router.put("/scores/:id/stage", async (req, res): Promise<void> => {
  const params = UpdateScoreStageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateScoreStageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { stage, rejectionReason } = parsed.data;
  if (!PIPELINE_STAGES.includes(stage as (typeof PIPELINE_STAGES)[number])) {
    res.status(400).json({ error: `Invalid stage: ${stage}` });
    return;
  }
  if (stage === "REJECTED" && (rejectionReason == null || rejectionReason === "")) {
    res.status(400).json({ error: "A rejection reason is required when rejecting a candidate" });
    return;
  }

  const [existing] = await db
    .select()
    .from(candidateScoresTable)
    .where(eq(candidateScoresTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Score not found" });
    return;
  }

  if (stage === "SHORTLISTED" && existing.stage !== "SHORTLISTED") {
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, existing.roleId));
    if (role) {
      const shortlisted = await db
        .select()
        .from(candidateScoresTable)
        .where(
          and(
            eq(candidateScoresTable.roleId, existing.roleId),
            eq(candidateScoresTable.stage, "SHORTLISTED"),
          ),
        );
      if (shortlisted.length >= role.maxShortlist) {
        res.status(400).json({
          error: `Shortlist is full (max ${role.maxShortlist}). Move someone out before adding another.`,
        });
        return;
      }
    }
  }

  const [updated] = await db
    .update(candidateScoresTable)
    .set({ stage, rejectionReason: stage === "REJECTED" ? rejectionReason ?? null : null })
    .where(eq(candidateScoresTable.id, params.data.id))
    .returning();

  await db.insert(activityTable).values({
    entityType: "SCORE",
    entityId: updated.id,
    action: "STAGE_CHANGED",
    details: `Moved candidate to ${stage}`,
  });

  res.json(UpdateScoreStageResponse.parse(mapScore(updated)));
});

export default router;
