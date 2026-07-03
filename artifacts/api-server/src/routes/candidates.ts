import { Router, type IRouter } from "express";
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
  activityTable,
} from "@workspace/db";
import {
  CreateCandidateBody,
  GetCandidateResponse,
  CreateCandidateResponse,
  ListCandidatesResponse,
  GetCandidateParams,
  UpdateCandidateParams,
  UpdateCandidateBody,
  UpdateCandidateResponse,
  DeleteCandidateParams,
  GetCandidateTrustGraphParams,
  GetCandidateTrustGraphResponse,
  GetCandidateDossierParams,
  GetCandidateDossierResponse,
} from "@workspace/api-zod";
import {
  mapCandidate,
  mapCandidateListItem,
  mapTrustEdge,
  currentExperience,
  iso,
} from "../lib/mappers";
import {
  computeCareerVelocity,
  computeProfileCompleteness,
  trustWeight,
} from "../lib/talent";
import { buildDossier, loadCandidateBundle } from "../lib/dossier";

const router: IRouter = Router();

router.get("/candidates", async (req, res): Promise<void> => {
  const q = req.query;
  const search = typeof q.search === "string" ? q.search.toLowerCase() : "";
  const status = typeof q.status === "string" ? q.status : "";
  const source = typeof q.source === "string" ? q.source : "";
  const skillFilter = typeof q.skill === "string" ? q.skill.toLowerCase() : "";
  const location = typeof q.location === "string" ? q.location.toLowerCase() : "";
  const minComp = typeof q.minComp === "string" ? Number(q.minComp) : undefined;
  const maxComp = typeof q.maxComp === "string" ? Number(q.maxComp) : undefined;
  const sort = typeof q.sort === "string" ? q.sort : "";

  const candidates = await db.select().from(candidatesTable);
  const allExp = await db.select().from(experiencesTable);
  const allSkills = await db.select().from(skillsTable);
  const allScores = await db.select().from(candidateScoresTable);

  let items = candidates.map((c) =>
    mapCandidateListItem(
      c,
      allExp.filter((e) => e.candidateId === c.id),
      allSkills.filter((s) => s.candidateId === c.id),
      allScores.filter((s) => s.candidateId === c.id),
    ),
  );

  items = items.filter((i) => {
    if (status && i.status !== status) return false;
    if (source && i.source !== source) return false;
    if (search) {
      const hay = `${i.name} ${i.currentTitle ?? ""} ${i.currentCompany ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (location && !(i.location ?? "").toLowerCase().includes(location)) return false;
    if (skillFilter && !i.topSkills.some((s) => s.name.toLowerCase().includes(skillFilter)))
      return false;
    if (minComp != null && (i.compensationExpected ?? 0) < minComp) return false;
    if (maxComp != null && (i.compensationExpected ?? Infinity) > maxComp) return false;
    return true;
  });

  items.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "velocity") return (b.careerVelocity ?? 0) - (a.careerVelocity ?? 0);
    if (sort === "compensation")
      return (b.compensationExpected ?? 0) - (a.compensationExpected ?? 0);
    return (b.compositeScore ?? 0) - (a.compositeScore ?? 0);
  });

  res.json(ListCandidatesResponse.parse(items));
});

router.post("/candidates", async (req, res): Promise<void> => {
  const parsed = CreateCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { experiences = [], skills = [], ...rest } = parsed.data;

  const velocity = computeCareerVelocity(
    experiences.map((e) => ({
      startDate: e.startDate,
      endDate: e.endDate ?? null,
      promoted: e.promoted ?? false,
    })),
  );
  const completeness = computeProfileCompleteness({
    email: rest.email ?? null,
    phone: rest.phone ?? null,
    location: rest.location ?? null,
    linkedinUrl: rest.linkedinUrl ?? null,
    impactSummary: rest.impactSummary ?? null,
    compensationExpected: rest.compensationExpected ?? null,
    experienceCount: experiences.length,
    skillCount: skills.length,
  });

  const [created] = await db
    .insert(candidatesTable)
    .values({
      ...rest,
      careerVelocity: velocity,
      profileCompleteness: completeness,
    })
    .returning();

  if (experiences.length) {
    await db.insert(experiencesTable).values(
      experiences.map((e, idx) => ({
        candidateId: created.id,
        company: e.company,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        promoted: e.promoted ?? false,
        description: e.description ?? null,
        order: e.order ?? idx,
      })),
    );
  }
  if (skills.length) {
    await db.insert(skillsTable).values(
      skills.map((s) => ({
        candidateId: created.id,
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
      })),
    );
  }
  await db.insert(activityTable).values({
    entityType: "CANDIDATE",
    entityId: created.id,
    action: "CREATED",
    details: `Added candidate ${created.name}`,
  });

  const bundle = await loadCandidateBundle(created.id);
  res.status(201).json(CreateCandidateResponse.parse(mapCandidate(bundle!.c, bundle!.experiences, bundle!.skills, [])));
});

router.get("/candidates/:id", async (req, res): Promise<void> => {
  const params = GetCandidateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const bundle = await loadCandidateBundle(params.data.id);
  if (!bundle) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }
  const roleIds = [...new Set(bundle.scores.map((s) => s.roleId))];
  const roles = roleIds.length
    ? await db.select().from(rolesTable).where(inArray(rolesTable.id, roleIds))
    : [];
  const clientIds = [...new Set(roles.map((r) => r.clientId))];
  const clients = clientIds.length
    ? await db.select().from(clientsTable).where(inArray(clientsTable.id, clientIds))
    : [];
  const scoreHistory = bundle.scores.map((score) => {
    const role = roles.find((r) => r.id === score.roleId);
    const client = clients.find((cl) => cl.id === role?.clientId);
    return {
      score,
      roleTitle: role?.title ?? "Unknown role",
      clientName: client?.companyName ?? "Unknown client",
    };
  });
  res.json(
    GetCandidateResponse.parse(
      mapCandidate(bundle.c, bundle.experiences, bundle.skills, scoreHistory),
    ),
  );
});

router.put("/candidates/:id", async (req, res): Promise<void> => {
  const params = UpdateCandidateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { experiences, skills, ...rest } = parsed.data;
  const id = params.data.id;

  const [existing] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  if (experiences) {
    await db.delete(experiencesTable).where(eq(experiencesTable.candidateId, id));
    if (experiences.length) {
      await db.insert(experiencesTable).values(
        experiences.map((e, idx) => ({
          candidateId: id,
          company: e.company,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate ?? null,
          promoted: e.promoted ?? false,
          description: e.description ?? null,
          order: e.order ?? idx,
        })),
      );
    }
  }
  if (skills) {
    await db.delete(skillsTable).where(eq(skillsTable.candidateId, id));
    if (skills.length) {
      await db.insert(skillsTable).values(
        skills.map((s) => ({
          candidateId: id,
          name: s.name,
          category: s.category,
          proficiency: s.proficiency,
        })),
      );
    }
  }

  const expForCalc = experiences ?? (await db.select().from(experiencesTable).where(eq(experiencesTable.candidateId, id)));
  const skillsForCalc = skills ?? (await db.select().from(skillsTable).where(eq(skillsTable.candidateId, id)));
  const velocity = computeCareerVelocity(
    expForCalc.map((e) => ({ startDate: e.startDate, endDate: e.endDate ?? null, promoted: e.promoted ?? false })),
  );
  const completeness = computeProfileCompleteness({
    email: rest.email ?? existing.email,
    phone: rest.phone ?? existing.phone,
    location: rest.location ?? existing.location,
    linkedinUrl: rest.linkedinUrl ?? existing.linkedinUrl,
    impactSummary: rest.impactSummary ?? existing.impactSummary,
    compensationExpected: rest.compensationExpected ?? existing.compensationExpected,
    experienceCount: expForCalc.length,
    skillCount: skillsForCalc.length,
  });

  await db
    .update(candidatesTable)
    .set({ ...rest, careerVelocity: velocity, profileCompleteness: completeness })
    .where(eq(candidatesTable.id, id));

  const bundle = await loadCandidateBundle(id);
  res.json(UpdateCandidateResponse.parse(mapCandidate(bundle!.c, bundle!.experiences, bundle!.skills, [])));
});

router.delete("/candidates/:id", async (req, res): Promise<void> => {
  const params = DeleteCandidateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(candidatesTable)
    .where(eq(candidatesTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/candidates/:id/trust-graph", async (req, res): Promise<void> => {
  const params = GetCandidateTrustGraphParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const id = params.data.id;
  const edges = await db.select().from(trustEdgesTable);
  const related = edges.filter((e) => e.fromCandidateId === id || e.toCandidateId === id);
  const nodeIds = new Set<string>([id]);
  related.forEach((e) => {
    nodeIds.add(e.fromCandidateId);
    nodeIds.add(e.toCandidateId);
  });
  const candidates = nodeIds.size
    ? await db.select().from(candidatesTable).where(inArray(candidatesTable.id, [...nodeIds]))
    : [];
  const allExp = await db.select().from(experiencesTable);
  const allScores = await db.select().from(candidateScoresTable);

  const nodes = candidates.map((c) => {
    const cur = currentExperience(allExp.filter((e) => e.candidateId === c.id));
    const scores = allScores.filter((s) => s.candidateId === c.id);
    return {
      id: c.id,
      name: c.name,
      currentTitle: cur?.title ?? null,
      currentCompany: cur?.company ?? null,
      avatarUrl: c.avatarUrl,
      status: c.status,
      compositeScore: scores.length ? Math.max(...scores.map((s) => s.compositeScore)) : null,
      edgeCount: related.filter((e) => e.fromCandidateId === c.id || e.toCandidateId === c.id).length,
    };
  });
  res.json(
    GetCandidateTrustGraphResponse.parse({ nodes, edges: related.map(mapTrustEdge) }),
  );
});

router.get("/candidates/:id/dossier/:roleId", async (req, res): Promise<void> => {
  const params = GetCandidateDossierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { id, roleId } = params.data;
  const result = await buildDossier(id, roleId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(GetCandidateDossierResponse.parse(result.payload));
});

export default router;
