import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  rolesTable,
  clientsTable,
  candidatesTable,
  candidateScoresTable,
  experiencesTable,
  skillsTable,
  activityTable,
} from "@workspace/db";
import {
  ListRolesResponse,
  CreateRoleBody,
  CreateRoleResponse,
  GetRoleParams,
  GetRoleResponse,
  UpdateRoleParams,
  UpdateRoleBody,
  UpdateRoleResponse,
  GetRolePipelineParams,
  GetRolePipelineResponse,
  MatchRoleParams,
  MatchRoleResponse,
} from "@workspace/api-zod";
import { mapRole, mapRoleListItem, currentExperience, mapSkill } from "../lib/mappers";

const router: IRouter = Router();

router.get("/roles", async (req, res): Promise<void> => {
  const q = req.query;
  const roles = await db.select().from(rolesTable);
  const clients = await db.select().from(clientsTable);
  const scores = await db.select().from(candidateScoresTable);

  let items = roles.map((r) => {
    const client = clients.find((c) => c.id === r.clientId);
    const pipelineCount = scores.filter((s) => s.roleId === r.id).length;
    return mapRoleListItem(r, client?.companyName ?? "Unknown", pipelineCount);
  });

  if (typeof q.status === "string") items = items.filter((i) => i.status === q.status);
  if (typeof q.department === "string") items = items.filter((i) => i.department === q.department);
  if (typeof q.level === "string") items = items.filter((i) => i.level === q.level);
  if (typeof q.clientId === "string") items = items.filter((i) => i.clientId === q.clientId);
  if (typeof q.published === "string")
    items = items.filter((i) => i.publishedToNetwork === (q.published === "true"));

  items.sort((a, b) => b.daysOpen - a.daysOpen);
  res.json(ListRolesResponse.parse(items));
});

router.post("/roles", async (req, res): Promise<void> => {
  const parsed = CreateRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db.insert(rolesTable).values(parsed.data).returning();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, created.clientId));
  await db.insert(activityTable).values({
    entityType: "ROLE",
    entityId: created.id,
    action: "CREATED",
    details: `Opened role ${created.title} for ${client?.companyName ?? "client"}`,
  });
  res.status(201).json(CreateRoleResponse.parse(mapRole(created, client?.companyName ?? "Unknown", [])));
});

router.get("/roles/:id", async (req, res): Promise<void> => {
  const params = GetRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, params.data.id));
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, role.clientId));
  const scores = await db
    .select()
    .from(candidateScoresTable)
    .where(eq(candidateScoresTable.roleId, role.id));
  res.json(GetRoleResponse.parse(mapRole(role, client?.companyName ?? "Unknown", scores)));
});

router.put("/roles/:id", async (req, res): Promise<void> => {
  const params = UpdateRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(rolesTable)
    .set(parsed.data)
    .where(eq(rolesTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, updated.clientId));
  const scores = await db
    .select()
    .from(candidateScoresTable)
    .where(eq(candidateScoresTable.roleId, updated.id));
  res.json(UpdateRoleResponse.parse(mapRole(updated, client?.companyName ?? "Unknown", scores)));
});

router.get("/roles/:id/pipeline", async (req, res): Promise<void> => {
  const params = GetRolePipelineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const scores = await db
    .select()
    .from(candidateScoresTable)
    .where(eq(candidateScoresTable.roleId, params.data.id));
  const candidateIds = [...new Set(scores.map((s) => s.candidateId))];
  const candidates = candidateIds.length
    ? await db.select().from(candidatesTable).where(inArray(candidatesTable.id, candidateIds))
    : [];
  const allExp = await db.select().from(experiencesTable);
  const allSkills = await db.select().from(skillsTable);

  const cards = scores.map((s) => {
    const cand = candidates.find((c) => c.id === s.candidateId);
    const cur = currentExperience(allExp.filter((e) => e.candidateId === s.candidateId));
    const topSkills = allSkills
      .filter((sk) => sk.candidateId === s.candidateId)
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 3)
      .map(mapSkill);
    return {
      id: s.id,
      candidateId: s.candidateId,
      candidateName: cand?.name ?? "Unknown",
      avatarUrl: cand?.avatarUrl ?? null,
      currentTitle: cur?.title ?? null,
      compositeScore: s.compositeScore,
      trustScore: s.trustScore,
      topSkills,
      stage: s.stage,
    };
  });
  res.json(GetRolePipelineResponse.parse(cards));
});

router.post("/roles/:id/match", async (req, res): Promise<void> => {
  const params = MatchRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, params.data.id));
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  const candidates = await db.select().from(candidatesTable);
  const allExp = await db.select().from(experiencesTable);
  const allSkills = await db.select().from(skillsTable);
  const existingScores = await db
    .select()
    .from(candidateScoresTable)
    .where(eq(candidateScoresTable.roleId, role.id));
  const inPipeline = new Set(existingScores.map((s) => s.candidateId));

  const must = role.mustHaveSkills.map((s) => s.toLowerCase());
  const nice = role.niceToHaveSkills.map((s) => s.toLowerCase());

  const results = candidates
    .map((c) => {
      const skills = allSkills.filter((s) => s.candidateId === c.id);
      const skillNames = skills.map((s) => s.name.toLowerCase());
      const matchedMust = must.filter((m) => skillNames.some((sn) => sn.includes(m)));
      const matchedNice = nice.filter((n) => skillNames.some((sn) => sn.includes(n)));
      const compFit =
        c.compensationExpected == null
          ? 0.5
          : c.compensationExpected <= role.compensationMax
            ? 1
            : 0.3;
      const mustScore = must.length ? matchedMust.length / must.length : 0.5;
      const niceScore = nice.length ? matchedNice.length / nice.length : 0;
      const matchScore = Math.round((mustScore * 70 + niceScore * 20 + compFit * 10) * 10) / 10;
      const cur = currentExperience(allExp.filter((e) => e.candidateId === c.id));
      const matchedSkills = [...new Set([...matchedMust, ...matchedNice])];
      return {
        candidateId: c.id,
        name: c.name,
        avatarUrl: c.avatarUrl,
        currentTitle: cur?.title ?? null,
        currentCompany: cur?.company ?? null,
        matchScore,
        matchedSkills,
        alreadyInPipeline: inPipeline.has(c.id),
      };
    })
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20);

  res.json(MatchRoleResponse.parse(results));
});

export default router;
