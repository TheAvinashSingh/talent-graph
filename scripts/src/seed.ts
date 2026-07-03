import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  db,
  candidatesTable,
  experiencesTable,
  skillsTable,
  clientsTable,
  rolesTable,
  candidateScoresTable,
  trustEdgesTable,
  referralsTable,
  placementsTable,
  activityTable,
  usersTable,
  clientUsersTable,
} from "@workspace/db";

const TRUST_WEIGHTS: Record<string, number> = {
  REFERRED: 3,
  WORKED_WITH: 2,
  MANAGED: 4,
  MANAGED_BY: 4,
  WOULD_HIRE_AGAIN: 5,
};

function composite(s: {
  roleFitScore: number;
  evidenceScore: number;
  leadershipScore: number;
  trustScore: number;
  evaluationScore: number;
}) {
  return (
    Math.round(
      (s.roleFitScore * 0.4 +
        s.evidenceScore * 0.25 +
        s.leadershipScore * 0.15 +
        s.trustScore * 0.1 +
        s.evaluationScore * 0.1) *
        10,
    ) / 10
  );
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function rand(min: number, max: number, seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  const frac = x - Math.floor(x);
  return Math.floor(min + frac * (max - min + 1));
}

const firstNames = [
  "Aarav", "Ananya", "Vihaan", "Diya", "Arjun", "Ishaan", "Saanvi", "Aditya",
  "Kavya", "Rohan", "Priya", "Karthik", "Meera", "Siddharth", "Tara", "Nikhil",
  "Sneha", "Rahul", "Pooja", "Aman", "Riya", "Vikram", "Neha", "Aryan",
  "Shreya", "Karan", "Anjali", "Devansh", "Isha", "Manish", "Divya", "Akash",
  "Nandini", "Varun", "Sanya", "Harsh", "Aditi", "Yash", "Lakshmi", "Gaurav",
  "Trisha", "Abhinav", "Megha", "Sameer", "Aishwarya", "Raghav", "Swati", "Dev",
  "Anushka", "Kabir",
];
const lastNames = [
  "Sharma", "Verma", "Patel", "Reddy", "Iyer", "Nair", "Rao", "Mehta",
  "Gupta", "Singh", "Kapoor", "Joshi", "Desai", "Menon", "Pillai", "Bose",
  "Chatterjee", "Banerjee", "Krishnan", "Malhotra",
];
const companies = [
  "Flipkart", "Razorpay", "Zerodha", "Swiggy", "Zomato", "CRED", "PhonePe",
  "Meesho", "Postman", "Freshworks", "Zoho", "BrowserStack", "Groww", "Dunzo",
  "Ola", "Myntra", "Nykaa", "Unacademy", "PharmEasy", "Urban Company",
];
const cities = [
  "Bengaluru", "Mumbai", "Hyderabad", "Pune", "Gurugram", "Delhi NCR",
  "Chennai", "Noida",
];
const productTitles = [
  "Product Manager", "Senior Product Manager", "Group Product Manager",
  "Director of Product", "VP Product", "Principal Product Manager",
];
const engTitles = [
  "Software Engineer", "Senior Software Engineer", "Staff Engineer",
  "Engineering Manager", "Director of Engineering", "VP Engineering",
];
const productSkills = [
  "Product Strategy", "Roadmapping", "User Research", "Growth", "A/B Testing",
  "Analytics", "Monetization", "Go-to-Market", "Stakeholder Management",
];
const techSkills = [
  "Go", "Kubernetes", "React", "Node.js", "Python", "Distributed Systems",
  "AWS", "PostgreSQL", "System Design", "Kafka", "GraphQL", "TypeScript",
];
const leadershipSkills = [
  "Team Building", "Hiring", "Mentorship", "Org Design", "Vision Setting",
];
const domainSkills = ["Fintech", "E-commerce", "SaaS", "Healthtech", "Edtech", "Logistics"];

const sources = ["DIRECT_SEARCH", "REFERRAL", "COMMUNITY", "INBOUND"];
const statuses = ["AVAILABLE", "PASSIVE", "PASSIVE", "NOT_LOOKING"];
const remotePrefs = ["REMOTE", "HYBRID", "ONSITE", "FLEXIBLE"];

async function clear() {
  await db.delete(activityTable);
  await db.delete(placementsTable);
  await db.delete(referralsTable);
  await db.delete(clientUsersTable);
  await db.delete(usersTable);
  await db.delete(trustEdgesTable);
  await db.delete(candidateScoresTable);
  await db.delete(rolesTable);
  await db.delete(clientsTable);
  await db.delete(skillsTable);
  await db.delete(experiencesTable);
  await db.delete(candidatesTable);
}

async function main() {
  console.log("Clearing existing data...");
  await clear();

  console.log("Seeding candidates...");
  const candidateIds: string[] = [];
  const candidateIsProduct: boolean[] = [];

  for (let i = 0; i < 50; i++) {
    const isProduct = i % 2 === 0;
    const name = `${pick(firstNames, i)} ${pick(lastNames, i * 3 + 1)}`;
    const seniority = rand(0, 5, i);
    const titlePool = isProduct ? productTitles : engTitles;
    const baseComp = 25 + seniority * 20 + rand(0, 15, i + 7);

    const [c] = await db
      .insert(candidatesTable)
      .values({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        phone: `+91 98${rand(10000000, 99999999, i)}`,
        location: pick(cities, i),
        linkedinUrl: `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, "-")}`,
        avatarUrl: null,
        arrInfluenced: isProduct ? rand(5, 200, i) : rand(1, 80, i),
        revenueImpact: isProduct
          ? `Drove ₹${rand(10, 150, i)} Cr in incremental ARR through product-led growth`
          : `Scaled platform to handle ${rand(2, 50, i)}x traffic growth`,
        productsLaunched: isProduct ? rand(2, 12, i) : rand(1, 6, i),
        usersImpacted: rand(1, 80, i) * 1000000,
        impactSummary: isProduct
          ? `Seasoned product leader with a track record of building 0-to-1 products and scaling them to millions of users in the Indian market.`
          : `Hands-on engineering leader specializing in high-scale distributed systems and developer productivity.`,
        teamSize: seniority >= 3 ? rand(5, 60, i) : rand(0, 6, i),
        hiringResponsibility: seniority >= 2,
        budgetOwnership: seniority >= 4 ? `₹${rand(2, 25, i)} Cr annual budget` : null,
        executiveExposure: seniority >= 4 ? "Regular board and leadership presentations" : null,
        peopleManaged: seniority >= 3 ? rand(5, 80, i) : 0,
        directReportsCurrently: seniority >= 3 ? rand(3, 12, i) : 0,
        compensationCurrent: baseComp,
        compensationExpected: baseComp + rand(8, 30, i),
        remotePreference: pick(remotePrefs, i),
        relocationOpen: i % 3 === 0,
        industryInterests: [pick(domainSkills, i), pick(domainSkills, i + 2)],
        noticePeriod: pick([30, 60, 90], i),
        status: pick(statuses, i),
        source: pick(sources, i),
      })
      .returning();
    candidateIds.push(c.id);
    candidateIsProduct.push(isProduct);

    // Experiences (2-4)
    const numExp = rand(2, 4, i);
    let yearCursor = 2025 - rand(1, 3, i);
    for (let e = 0; e < numExp; e++) {
      const duration = rand(1, 3, i + e);
      const start = yearCursor - duration;
      const isCurrent = e === 0;
      await db.insert(experiencesTable).values({
        candidateId: c.id,
        company: pick(companies, i + e * 5),
        title: pick(titlePool, Math.max(0, seniority - e)),
        startDate: `${start}-0${rand(1, 9, i + e)}-01`,
        endDate: isCurrent ? null : `${yearCursor}-0${rand(1, 9, i + e + 1)}-01`,
        promoted: e < numExp - 1 && i % 2 === 0,
        description: null,
        order: e,
      });
      yearCursor = start;
    }

    // Skills
    const skillSet: { name: string; category: string; proficiency: number }[] = [];
    const primary = isProduct ? productSkills : techSkills;
    for (let s = 0; s < 5; s++) {
      skillSet.push({
        name: pick(primary, i + s),
        category: isProduct ? "PRODUCT" : "TECHNICAL",
        proficiency: rand(3, 5, i + s),
      });
    }
    if (seniority >= 3) {
      skillSet.push({
        name: pick(leadershipSkills, i),
        category: "LEADERSHIP",
        proficiency: rand(3, 5, i),
      });
    }
    skillSet.push({
      name: pick(domainSkills, i),
      category: "DOMAIN",
      proficiency: rand(3, 5, i + 2),
    });
    // dedupe by name
    const seen = new Set<string>();
    const unique = skillSet.filter((sk) => {
      if (seen.has(sk.name)) return false;
      seen.add(sk.name);
      return true;
    });
    await db.insert(skillsTable).values(
      unique.map((sk) => ({ candidateId: c.id, ...sk })),
    );

    // career velocity + completeness
    const promotions = numExp > 1 && i % 2 === 0 ? numExp - 1 : 0;
    await db
      .update(candidatesTable)
      .set({
        careerVelocity: Math.round((promotions * 2 + numExp) / 5 * 10) / 10,
        profileCompleteness: rand(70, 100, i),
      })
      .where(eq(candidatesTable.id, c.id));
  }

  console.log("Seeding clients...");
  const clientData = [
    { companyName: "Lendwise", industry: "Fintech", size: "200-500" },
    { companyName: "ShopNova", industry: "E-commerce", size: "500-1000" },
    { companyName: "MediCore", industry: "Healthtech", size: "50-200" },
    { companyName: "EduLeap", industry: "Edtech", size: "200-500" },
    { companyName: "CloudForge", industry: "SaaS", size: "100-200" },
    { companyName: "FreightX", industry: "Logistics", size: "500-1000" },
    { companyName: "PayStack India", industry: "Fintech", size: "1000+" },
    { companyName: "GreenCart", industry: "E-commerce", size: "50-200" },
  ];
  const clientIds: string[] = [];
  for (let i = 0; i < clientData.length; i++) {
    const cd = clientData[i];
    const [client] = await db
      .insert(clientsTable)
      .values({
        companyName: cd.companyName,
        industry: cd.industry,
        size: cd.size,
        website: `https://${cd.companyName.toLowerCase().replace(/\s+/g, "")}.com`,
        contactName: `${pick(firstNames, i + 5)} ${pick(lastNames, i)}`,
        contactEmail: `talent@${cd.companyName.toLowerCase().replace(/\s+/g, "")}.com`,
        contactPhone: `+91 80${rand(10000000, 99999999, i)}`,
        status: i < 6 ? "ACTIVE" : "PROSPECT",
      })
      .returning();
    clientIds.push(client.id);
  }

  console.log("Seeding roles...");
  const levels = ["MANAGER", "SENIOR_MANAGER", "DIRECTOR", "VP", "IC"];
  const departments = ["PRODUCT", "ENGINEERING"];
  const roleIds: string[] = [];
  const roleIsProduct: boolean[] = [];
  for (let i = 0; i < 12; i++) {
    const isProduct = i % 2 === 0;
    const dept = isProduct ? "PRODUCT" : "ENGINEERING";
    const level = pick(levels, i);
    const compMin = 40 + rand(0, 4, i) * 20;
    const must = isProduct
      ? [pick(productSkills, i), pick(productSkills, i + 1)]
      : [pick(techSkills, i), pick(techSkills, i + 1)];
    const nice = isProduct
      ? [pick(productSkills, i + 3)]
      : [pick(techSkills, i + 3), pick(techSkills, i + 5)];
    const [role] = await db
      .insert(rolesTable)
      .values({
        clientId: pick(clientIds, i),
        title: isProduct ? pick(productTitles, i) : pick(engTitles, i),
        level,
        department: dept,
        compensationMin: compMin,
        compensationMax: compMin + rand(20, 50, i),
        feePercentage: 8.33,
        location: pick(cities, i),
        remotePolicy: pick(remotePrefs, i),
        mustHaveSkills: must,
        niceToHaveSkills: nice,
        experienceMin: 4 + rand(0, 4, i),
        experienceMax: 10 + rand(0, 6, i),
        industryPreference: [pick(domainSkills, i)],
        teamContext: "Joining a fast-growing team reporting to the founders, with high ownership and autonomy.",
        successCriteria: isProduct
          ? "Ship a measurable improvement to activation within the first two quarters."
          : "Stabilize platform reliability to 99.9% and grow the team by 40%.",
        antiPatterns: isProduct
          ? ["Pure feature-factory background", "No metrics ownership"]
          : ["Only consulting experience", "No hands-on coding in 3+ years"],
        impactThreshold: "Must have driven outcomes at scale (millions of users or ₹10Cr+ impact).",
        leadershipSignal: "Has built and retained high-performing teams.",
        cultureFit: "High agency, low ego, bias for action.",
        status: pick(["ACTIVE", "ACTIVE", "SHORTLISTING", "INTERVIEWING", "DISCOVERY"], i),
        publishedToNetwork: i % 2 === 0,
        maxShortlist: 5,
      })
      .returning();
    roleIds.push(role.id);
    roleIsProduct.push(isProduct);
  }

  console.log("Seeding pipeline scores...");
  const pipelineStages = ["SOURCED", "SCREENED", "EVALUATED", "SHORTLISTED", "INTERVIEWING", "OFFERED"];
  for (let r = 0; r < roleIds.length; r++) {
    // Assign 4-7 candidates matching department to each role
    const matching = candidateIds.filter((_, idx) => candidateIsProduct[idx] === roleIsProduct[r]);
    const count = rand(4, 7, r);
    for (let k = 0; k < count; k++) {
      const candId = pick(matching, r * 3 + k);
      const dims = {
        roleFitScore: rand(50, 95, r + k),
        evidenceScore: rand(45, 95, r + k + 1),
        leadershipScore: rand(40, 95, r + k + 2),
        trustScore: rand(30, 90, r + k + 3),
        evaluationScore: rand(40, 90, r + k + 4),
      };
      // avoid duplicate candidate per role
      const existing = await db
        .select()
        .from(candidateScoresTable);
      if (existing.some((e) => e.candidateId === candId && e.roleId === roleIds[r])) continue;
      await db.insert(candidateScoresTable).values({
        candidateId: candId,
        roleId: roleIds[r],
        ...dims,
        compositeScore: composite(dims),
        stage: k === 0 ? "SHORTLISTED" : pick(pipelineStages, k),
        recruiterNotes: "Strong signal on role fit; validated impact claims via backchannel.",
      });
    }
  }

  console.log("Seeding trust edges...");
  const relationships = ["REFERRED", "WORKED_WITH", "MANAGED", "MANAGED_BY", "WOULD_HIRE_AGAIN"];
  let edgeCount = 0;
  for (let i = 0; i < 45 && edgeCount < 40; i++) {
    const from = pick(candidateIds, i * 2);
    const to = pick(candidateIds, i * 2 + 7);
    if (from === to) continue;
    const rel = pick(relationships, i);
    const strength = rand(2, 5, i);
    await db.insert(trustEdgesTable).values({
      fromCandidateId: from,
      toCandidateId: to,
      relationship: rel,
      strength,
      context: "Worked together at a previous company.",
    });
    edgeCount++;
    if (rel === "WORKED_WITH") {
      await db.insert(trustEdgesTable).values({
        fromCandidateId: to,
        toCandidateId: from,
        relationship: "WORKED_WITH",
        strength,
        context: "Worked together at a previous company.",
      });
    } else if (rel === "MANAGED") {
      await db.insert(trustEdgesTable).values({
        fromCandidateId: to,
        toCandidateId: from,
        relationship: "MANAGED_BY",
        strength,
        context: "Reporting relationship.",
      });
    }
  }

  console.log("Seeding referrals...");
  const publishedRoles = roleIds.filter((_, idx) => idx % 2 === 0);
  const referralStatuses = ["SUBMITTED", "SCREENING", "SHORTLISTED", "INTERVIEWED", "HIRED", "REJECTED"];
  for (let i = 0; i < 15; i++) {
    const referrer = pick(candidateIds, i * 4);
    const candName = `${pick(firstNames, i + 11)} ${pick(lastNames, i + 4)}`;
    await db.insert(referralsTable).values({
      referrerId: referrer,
      roleId: pick(publishedRoles, i),
      candidateId: i % 3 === 0 ? pick(candidateIds, i * 5 + 2) : null,
      candidateName: candName,
      candidateEmail: `${candName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      candidateLinkedin: `https://linkedin.com/in/${candName.toLowerCase().replace(/\s+/g, "-")}`,
      status: pick(referralStatuses, i),
      rewardAmount: i % 4 === 0 ? rand(50000, 200000, i) : null,
      rewardPaid: i % 5 === 0,
      note: "Top performer from my previous team, would vouch strongly.",
    });
  }

  console.log("Seeding placements...");
  for (let i = 0; i < 5; i++) {
    const roleId = pick(roleIds, i * 2 + 1);
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId));
    const matching = candidateIds.filter((_, idx) => candidateIsProduct[idx] === roleIsProduct[i * 2 + 1]);
    const candId = pick(matching, i + 3);
    const actualComp = role.compensationMin + rand(5, 25, i);
    const feeAmount = Math.round(actualComp * (role.feePercentage / 100) * 100) / 100;
    const monthsAgo = i;
    const joinD = new Date();
    joinD.setMonth(joinD.getMonth() - monthsAgo);
    const created = new Date();
    created.setMonth(created.getMonth() - monthsAgo);
    const guarantee = new Date(joinD);
    guarantee.setDate(guarantee.getDate() + 90);
    await db.insert(placementsTable).values({
      roleId,
      candidateId: candId,
      clientId: role.clientId,
      actualCompensation: actualComp,
      feePercentage: role.feePercentage,
      feeAmount,
      offerDate: joinD.toISOString().slice(0, 10),
      joinDate: joinD.toISOString().slice(0, 10),
      guaranteeExpiry: guarantee.toISOString().slice(0, 10),
      status: pick(["JOINED", "PROBATION_PASSED", "CONFIRMED"], i),
      createdAt: created,
    });
  }

  console.log("Seeding activity feed...");
  await db.insert(activityTable).values([
    { entityType: "PLACEMENT", entityId: "seed", action: "CREATED", details: "New placement closed at Lendwise" },
    { entityType: "CANDIDATE", entityId: "seed", action: "CREATED", details: "5 new candidates added to the Talent Graph" },
    { entityType: "ROLE", entityId: "seed", action: "CREATED", details: "VP Engineering role opened at CloudForge" },
    { entityType: "REFERRAL", entityId: "seed", action: "CREATED", details: "New referral submitted via the network" },
    { entityType: "SCORE", entityId: "seed", action: "STAGE_CHANGED", details: "Candidate moved to Interviewing" },
  ]);

  console.log("Seeding login accounts...");
  const passwordHash = await bcrypt.hash("pass1234", 10);

  // Referrer linked to an existing high-completeness candidate node so referrals are allowed.
  const referrerCandidateId = candidateIds[0];
  await db
    .update(candidatesTable)
    .set({ profileCompleteness: 90 })
    .where(eq(candidatesTable.id, referrerCandidateId));

  await db.insert(usersTable).values([
    {
      name: "Admin User",
      email: "admin@test.com",
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
    },
    {
      name: "Referrer User",
      email: "ref@test.com",
      passwordHash,
      role: "REFERRER",
      referrerCandidateId,
      emailVerified: true,
    },
  ]);

  // Client account linked to an active client company.
  const [clientUser] = await db
    .insert(usersTable)
    .values({
      name: "Client User",
      email: "client@test.com",
      passwordHash,
      role: "CLIENT",
      emailVerified: true,
    })
    .returning();
  await db
    .insert(clientUsersTable)
    .values({ userId: clientUser.id, clientId: clientIds[0] });

  console.log("  admin@test.com / ref@test.com / client@test.com  (password: pass1234)");

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
