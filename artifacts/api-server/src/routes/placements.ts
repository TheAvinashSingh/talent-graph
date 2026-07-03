import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  placementsTable,
  rolesTable,
  candidatesTable,
  clientsTable,
  candidateScoresTable,
  activityTable,
} from "@workspace/db";
import {
  ListPlacementsResponse,
  CreatePlacementBody,
  CreatePlacementResponse,
  UpdatePlacementParams,
  UpdatePlacementBody,
  UpdatePlacementResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function decorate(rows: (typeof placementsTable.$inferSelect)[]) {
  const roles = await db.select().from(rolesTable);
  const candidates = await db.select().from(candidatesTable);
  const clients = await db.select().from(clientsTable);
  return rows.map((p) => {
    const role = roles.find((r) => r.id === p.roleId);
    const cand = candidates.find((c) => c.id === p.candidateId);
    const client = clients.find((c) => c.id === p.clientId);
    return {
      id: p.id,
      roleId: p.roleId,
      roleTitle: role?.title ?? "Unknown",
      candidateId: p.candidateId,
      candidateName: cand?.name ?? "Unknown",
      clientId: p.clientId,
      clientName: client?.companyName ?? "Unknown",
      actualCompensation: p.actualCompensation,
      feePercentage: p.feePercentage,
      feeAmount: p.feeAmount,
      estimatedFee: null,
      offerDate: p.offerDate,
      joinDate: p.joinDate,
      status: p.status,
      guaranteeExpiry: p.guaranteeExpiry,
      createdAt: p.createdAt.toISOString(),
    };
  });
}

router.get("/placements", async (_req, res): Promise<void> => {
  const rows = await db.select().from(placementsTable);
  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(ListPlacementsResponse.parse(await decorate(rows)));
});

router.post("/placements", async (req, res): Promise<void> => {
  const parsed = CreatePlacementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, d.roleId));
  if (!role) {
    res.status(400).json({ error: "Role not found" });
    return;
  }
  const feeAmount = Math.round(d.actualCompensation * (role.feePercentage / 100) * 100) / 100;
  const joinDate = d.joinDate ?? null;
  let guaranteeExpiry: string | null = null;
  if (joinDate) {
    const expiry = new Date(joinDate);
    expiry.setDate(expiry.getDate() + 90);
    guaranteeExpiry = expiry.toISOString().slice(0, 10);
  }

  const [created] = await db
    .insert(placementsTable)
    .values({
      roleId: d.roleId,
      candidateId: d.candidateId,
      clientId: role.clientId,
      actualCompensation: d.actualCompensation,
      feePercentage: role.feePercentage,
      feeAmount,
      offerDate: d.offerDate ?? null,
      joinDate,
      guaranteeExpiry,
      status: "CONFIRMED",
    })
    .returning();

  // Side effects: mark role placed, candidate placed, score stage placed.
  await db.update(rolesTable).set({ status: "PLACED" }).where(eq(rolesTable.id, d.roleId));
  await db
    .update(candidatesTable)
    .set({ status: "PLACED" })
    .where(eq(candidatesTable.id, d.candidateId));
  await db
    .update(candidateScoresTable)
    .set({ stage: "PLACED" })
    .where(
      and(
        eq(candidateScoresTable.candidateId, d.candidateId),
        eq(candidateScoresTable.roleId, d.roleId),
      ),
    );

  const [cand] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, d.candidateId));
  await db.insert(activityTable).values({
    entityType: "PLACEMENT",
    entityId: created.id,
    action: "CREATED",
    details: `Placed ${cand?.name ?? "candidate"} in ${role.title} (₹${feeAmount} Cr fee)`,
  });

  const [decorated] = await decorate([created]);
  res.status(201).json(CreatePlacementResponse.parse(decorated));
});

router.put("/placements/:id", async (req, res): Promise<void> => {
  const params = UpdatePlacementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePlacementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(placementsTable)
    .set({
      status: parsed.data.status,
      joinDate: parsed.data.joinDate ?? undefined,
    })
    .where(eq(placementsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Placement not found" });
    return;
  }
  const [decorated] = await decorate([updated]);
  res.json(UpdatePlacementResponse.parse(decorated));
});

export default router;
