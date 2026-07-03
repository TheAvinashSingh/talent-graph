import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  trustEdgesTable,
  candidatesTable,
  experiencesTable,
  candidateScoresTable,
  activityTable,
} from "@workspace/db";
import {
  GetTrustGraphResponse,
  CreateTrustEdgeBody,
  CreateTrustEdgeResponse,
  DeleteTrustEdgeParams,
} from "@workspace/api-zod";
import { mapTrustEdge, currentExperience } from "../lib/mappers";
import { trustWeight } from "../lib/talent";

const router: IRouter = Router();

const REVERSE: Record<string, string> = {
  MANAGED: "MANAGED_BY",
  MANAGED_BY: "MANAGED",
};

router.get("/trust-graph", async (req, res): Promise<void> => {
  const q = req.query;
  let edges = await db.select().from(trustEdgesTable);
  if (typeof q.relationship === "string")
    edges = edges.filter((e) => e.relationship === q.relationship);
  if (typeof q.minWeight === "string") {
    const min = Number(q.minWeight);
    edges = edges.filter((e) => trustWeight(e.relationship, e.strength) >= min);
  }

  const candidates = await db.select().from(candidatesTable);
  const allExp = await db.select().from(experiencesTable);
  const allScores = await db.select().from(candidateScoresTable);

  const filteredCandidates =
    typeof q.status === "string"
      ? candidates.filter((c) => c.status === q.status)
      : candidates;
  const allowedIds = new Set(filteredCandidates.map((c) => c.id));
  if (typeof q.status === "string") {
    edges = edges.filter(
      (e) => allowedIds.has(e.fromCandidateId) && allowedIds.has(e.toCandidateId),
    );
  }

  const nodes = filteredCandidates.map((c) => {
    const cur = currentExperience(allExp.filter((e) => e.candidateId === c.id));
    const scores = allScores.filter((s) => s.candidateId === c.id);
    const edgeCount = edges.filter(
      (e) => e.fromCandidateId === c.id || e.toCandidateId === c.id,
    ).length;
    return {
      id: c.id,
      name: c.name,
      currentTitle: cur?.title ?? null,
      currentCompany: cur?.company ?? null,
      avatarUrl: c.avatarUrl,
      status: c.status,
      compositeScore: scores.length ? Math.max(...scores.map((s) => s.compositeScore)) : null,
      edgeCount,
    };
  });

  res.json(GetTrustGraphResponse.parse({ nodes, edges: edges.map(mapTrustEdge) }));
});

router.post("/trust-edges", async (req, res): Promise<void> => {
  const parsed = CreateTrustEdgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  if (d.fromCandidateId === d.toCandidateId) {
    res.status(400).json({ error: "Cannot create a trust edge to the same candidate" });
    return;
  }
  const [created] = await db
    .insert(trustEdgesTable)
    .values({
      fromCandidateId: d.fromCandidateId,
      toCandidateId: d.toCandidateId,
      relationship: d.relationship,
      strength: d.strength ?? 3,
      context: d.context ?? null,
    })
    .returning();

  if (d.relationship === "WORKED_WITH") {
    await db.insert(trustEdgesTable).values({
      fromCandidateId: d.toCandidateId,
      toCandidateId: d.fromCandidateId,
      relationship: "WORKED_WITH",
      strength: d.strength ?? 3,
      context: d.context ?? null,
    });
  } else if (REVERSE[d.relationship]) {
    await db.insert(trustEdgesTable).values({
      fromCandidateId: d.toCandidateId,
      toCandidateId: d.fromCandidateId,
      relationship: REVERSE[d.relationship],
      strength: d.strength ?? 3,
      context: d.context ?? null,
    });
  }

  await db.insert(activityTable).values({
    entityType: "TRUST_EDGE",
    entityId: created.id,
    action: "CREATED",
    details: `New ${d.relationship} trust connection`,
  });

  res.status(201).json(CreateTrustEdgeResponse.parse(mapTrustEdge(created)));
});

router.delete("/trust-edges/:id", async (req, res): Promise<void> => {
  const params = DeleteTrustEdgeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(trustEdgesTable)
    .where(eq(trustEdgesTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Trust edge not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
