import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  clientUsersTable,
  clientsTable,
  candidatesTable,
  rolesTable,
  placementsTable,
  referralsTable,
} from "@workspace/db";
import { GetPlatformPeopleResponse } from "@workspace/api-zod";
import { scoutScore, isTalentScout } from "../lib/talent";
import { iso } from "../lib/mappers";
import { streamSourceArchive } from "../lib/source-archive";

const router: IRouter = Router();

router.get("/admin/source-archive", (req, res): void => {
  streamSourceArchive(req, res);
});

router.get("/admin/people", async (_req, res): Promise<void> => {
  const [users, clientLinks, clients, candidates, roles, placements, referrals] =
    await Promise.all([
      db.select().from(usersTable),
      db.select().from(clientUsersTable),
      db.select().from(clientsTable),
      db.select().from(candidatesTable),
      db.select().from(rolesTable),
      db.select().from(placementsTable),
      db.select().from(referralsTable),
    ]);

  const referrers = users
    .filter((u) => u.role === "REFERRER")
    .map((u) => {
      const candidate = u.referrerCandidateId
        ? candidates.find((c) => c.id === u.referrerCandidateId)
        : undefined;
      const mine = candidate
        ? referrals.filter((r) => r.referrerId === candidate.id)
        : [];
      const submitted = mine.length;
      const shortlisted = mine.filter((r) =>
        ["SHORTLISTED", "INTERVIEWED", "HIRED"].includes(r.status),
      ).length;
      const interviewed = mine.filter((r) =>
        ["INTERVIEWED", "HIRED"].includes(r.status),
      ).length;
      const hired = mine.filter((r) => r.status === "HIRED").length;
      const score = scoutScore({ submitted, shortlisted, interviewed, hired });
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        joinedAt: iso(u.createdAt),
        candidateId: candidate?.id ?? null,
        candidateName: candidate?.name ?? null,
        profileCompleteness: candidate?.profileCompleteness ?? null,
        scoutScore: score,
        submitted,
        hired,
        isTalentScout: isTalentScout(score, submitted, hired),
      };
    })
    .sort((a, b) => b.scoutScore - a.scoutScore);

  const clientAccounts = clientLinks
    .map((link) => {
      const user = users.find((u) => u.id === link.userId);
      const client = clients.find((c) => c.id === link.clientId);
      if (!user || !client) return null;
      const clientRoles = roles.filter((r) => r.clientId === client.id);
      const clientPlacements = placements.filter((p) => p.clientId === client.id);
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        joinedAt: iso(user.createdAt),
        clientId: client.id,
        companyName: client.companyName,
        industry: client.industry ?? null,
        clientStatus: client.status,
        activeRoles: clientRoles.filter(
          (r) => !["PLACED", "CANCELLED"].includes(r.status),
        ).length,
        totalPlacements: clientPlacements.length,
        totalFees: clientPlacements.reduce((sum, p) => sum + p.feeAmount, 0),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.totalFees - a.totalFees);

  res.json(
    GetPlatformPeopleResponse.parse({
      referrers,
      clients: clientAccounts,
    }),
  );
});

export default router;
