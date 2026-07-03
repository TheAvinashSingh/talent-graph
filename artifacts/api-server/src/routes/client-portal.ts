import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  rolesTable,
  placementsTable,
  candidatesTable,
  clientsTable,
  candidateScoresTable,
  experiencesTable,
} from "@workspace/db";
import {
  ListClientRolesResponse,
  ListClientPlacementsResponse,
  ListClientShortlistResponse,
  GetClientDossierParams,
  GetClientDossierResponse,
} from "@workspace/api-zod";
import { mapRoleListItem, currentExperience, iso } from "../lib/mappers";
import { buildDossier } from "../lib/dossier";

const router: IRouter = Router();

const SHORTLIST_STAGES = ["SHORTLISTED", "INTERVIEWING", "INTERVIEWED", "OFFER", "PLACED"];

function clientId(req: { user?: { clientId: string | null } }): string | null {
  return req.user?.clientId ?? null;
}

router.get("/roles", async (req, res): Promise<void> => {
  const me = clientId(req);
  if (!me) {
    res.json(ListClientRolesResponse.parse([]));
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, me));
  const roles = await db.select().from(rolesTable).where(eq(rolesTable.clientId, me));
  const scores = await db.select().from(candidateScoresTable);
  const items = roles.map((r) => ({
    ...mapRoleListItem(
      r,
      client?.companyName ?? "Unknown",
      scores.filter((s) => s.roleId === r.id).length,
    ),
    createdAt: iso(r.createdAt),
  }));
  items.sort((a, b) => b.daysOpen - a.daysOpen);
  res.json(ListClientRolesResponse.parse(items));
});

router.get("/placements", async (req, res): Promise<void> => {
  const me = clientId(req);
  if (!me) {
    res.json(ListClientPlacementsResponse.parse([]));
    return;
  }
  const rows = await db
    .select()
    .from(placementsTable)
    .where(eq(placementsTable.clientId, me));
  const roles = await db.select().from(rolesTable);
  const candidates = await db.select().from(candidatesTable);
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, me));
  const decorated = rows
    .map((p) => {
      const role = roles.find((r) => r.id === p.roleId);
      const cand = candidates.find((c) => c.id === p.candidateId);
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
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(ListClientPlacementsResponse.parse(decorated));
});

router.get("/shortlist", async (req, res): Promise<void> => {
  const me = clientId(req);
  if (!me) {
    res.json(ListClientShortlistResponse.parse([]));
    return;
  }
  const roles = await db.select().from(rolesTable).where(eq(rolesTable.clientId, me));
  const roleIds = new Set(roles.map((r) => r.id));
  const scores = await db.select().from(candidateScoresTable);
  const candidates = await db.select().from(candidatesTable);
  const experiences = await db.select().from(experiencesTable);

  const items = scores
    .filter((s) => roleIds.has(s.roleId) && SHORTLIST_STAGES.includes(s.stage))
    .map((s) => {
      const cand = candidates.find((c) => c.id === s.candidateId);
      const cur = currentExperience(experiences.filter((e) => e.candidateId === s.candidateId));
      return {
        candidateId: s.candidateId,
        roleId: s.roleId,
        candidateName: cand?.name ?? "Unknown",
        roleTitle: roles.find((r) => r.id === s.roleId)?.title ?? "Unknown",
        avatarUrl: cand?.avatarUrl ?? null,
        currentTitle: cur?.title ?? null,
        stage: s.stage,
        compositeScore: s.compositeScore,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
  res.json(ListClientShortlistResponse.parse(items));
});

router.get("/dossier/:candidateId/:roleId", async (req, res): Promise<void> => {
  const me = clientId(req);
  if (!me) {
    res.status(403).json({ error: "Your account is not linked to a client" });
    return;
  }
  const params = GetClientDossierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { candidateId, roleId } = params.data;

  // Authorisation: the role must belong to this client and the candidate must be
  // shortlisted (or further along) on that role.
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId));
  if (!role || role.clientId !== me) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  const candidateScores = await db
    .select()
    .from(candidateScoresTable)
    .where(eq(candidateScoresTable.candidateId, candidateId));
  const shortlisted = candidateScores.some(
    (s) => s.roleId === roleId && SHORTLIST_STAGES.includes(s.stage),
  );
  if (!shortlisted) {
    res.status(403).json({ error: "This candidate is not shortlisted for your role" });
    return;
  }

  const result = await buildDossier(candidateId, roleId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(GetClientDossierResponse.parse(result.payload));
});

export default router;
