import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  clientsTable,
  rolesTable,
  placementsTable,
  candidatesTable,
  candidateScoresTable,
  clientUsersTable,
  usersTable,
  activityTable,
} from "@workspace/db";
import {
  ListClientsResponse,
  CreateClientBody,
  CreateClientResponse,
  GetClientParams,
  GetClientResponse,
  UpdateClientParams,
  UpdateClientBody,
  UpdateClientResponse,
  InviteClientUserParams,
  InviteClientUserBody,
  InviteClientUserResponse,
} from "@workspace/api-zod";
import { mapClient, mapRoleListItem, iso } from "../lib/mappers";
import { createAuthToken } from "../lib/tokens";
import { sendInviteEmail } from "../lib/email";

const router: IRouter = Router();

router.get("/clients", async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable);
  const roles = await db.select().from(rolesTable);
  const placements = await db.select().from(placementsTable);

  const items = clients.map((c) => {
    const clientRoles = roles.filter((r) => r.clientId === c.id);
    const clientPlacements = placements.filter((p) => p.clientId === c.id);
    return {
      id: c.id,
      companyName: c.companyName,
      industry: c.industry,
      size: c.size,
      logoUrl: c.logoUrl,
      status: c.status,
      activeRoles: clientRoles.filter((r) => !["PLACED", "CANCELLED"].includes(r.status)).length,
      totalPlacements: clientPlacements.length,
      totalFees: clientPlacements.reduce((sum, p) => sum + p.feeAmount, 0),
    };
  });
  res.json(ListClientsResponse.parse(items));
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db.insert(clientsTable).values(parsed.data).returning();
  await db.insert(activityTable).values({
    entityType: "CLIENT",
    entityId: created.id,
    action: "CREATED",
    details: `Added client ${created.companyName}`,
  });
  res.status(201).json(
    CreateClientResponse.parse({
      ...mapClient(created),
      roles: [],
      placements: [],
      totalFees: 0,
      createdAt: iso(created.createdAt),
    }),
  );
});

router.post("/clients/:id/invite", async (req, res): Promise<void> => {
  const params = InviteClientUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = InviteClientUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const name = body.data.name.trim();
  const normalizedEmail = body.data.email.trim().toLowerCase();

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  // Create the user with no password (set when they accept the invite) tied to
  // this specific client, then email an activation link.
  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      email: normalizedEmail,
      passwordHash: null,
      role: "CLIENT",
      emailVerified: false,
    })
    .returning();
  await db.insert(clientUsersTable).values({ userId: user.id, clientId: client.id });

  await db.insert(activityTable).values({
    entityType: "USER",
    entityId: user.id,
    action: "INVITED",
    details: `Invited ${name} to ${client.companyName}`,
  });

  const token = await createAuthToken(user.id, "INVITE");
  try {
    await sendInviteEmail(user.email, user.name, client.companyName, token);
  } catch (err) {
    req.log.error({ err }, "Failed to send invite email");
    res.status(502).json({ error: "Account created but the invite email could not be sent." });
    return;
  }

  res.status(201).json(
    InviteClientUserResponse.parse({ message: `Invitation sent to ${normalizedEmail}` }),
  );
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const roles = await db.select().from(rolesTable).where(eq(rolesTable.clientId, client.id));
  const scores = await db.select().from(candidateScoresTable);
  const placements = await db
    .select()
    .from(placementsTable)
    .where(eq(placementsTable.clientId, client.id));
  const candidates = await db.select().from(candidatesTable);

  const roleItems = roles.map((r) =>
    mapRoleListItem(r, client.companyName, scores.filter((s) => s.roleId === r.id).length),
  );
  const placementItems = placements.map((p) => {
    const role = roles.find((r) => r.id === p.roleId);
    const cand = candidates.find((c) => c.id === p.candidateId);
    return {
      id: p.id,
      roleId: p.roleId,
      roleTitle: role?.title ?? "Unknown",
      candidateId: p.candidateId,
      candidateName: cand?.name ?? "Unknown",
      clientId: p.clientId,
      clientName: client.companyName,
      actualCompensation: p.actualCompensation,
      feePercentage: p.feePercentage,
      feeAmount: p.feeAmount,
      estimatedFee: null,
      offerDate: p.offerDate,
      joinDate: p.joinDate,
      status: p.status,
      guaranteeExpiry: p.guaranteeExpiry,
      createdAt: iso(p.createdAt),
    };
  });

  res.json(
    GetClientResponse.parse({
      ...mapClient(client),
      roles: roleItems,
      placements: placementItems,
      totalFees: placements.reduce((sum, p) => sum + p.feeAmount, 0),
      createdAt: iso(client.createdAt),
    }),
  );
});

router.put("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(eq(clientsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const placements = await db
    .select()
    .from(placementsTable)
    .where(eq(placementsTable.clientId, updated.id));
  res.json(
    UpdateClientResponse.parse({
      ...mapClient(updated),
      roles: [],
      placements: [],
      totalFees: placements.reduce((sum, p) => sum + p.feeAmount, 0),
      createdAt: iso(updated.createdAt),
    }),
  );
});

export default router;
