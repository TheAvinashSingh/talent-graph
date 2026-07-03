import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const candidatesTable = pgTable("candidates", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  avatarUrl: text("avatar_url"),
  arrInfluenced: doublePrecision("arr_influenced"),
  revenueImpact: text("revenue_impact"),
  productsLaunched: integer("products_launched"),
  usersImpacted: integer("users_impacted"),
  impactSummary: text("impact_summary"),
  teamSize: integer("team_size"),
  hiringResponsibility: boolean("hiring_responsibility").notNull().default(false),
  budgetOwnership: text("budget_ownership"),
  executiveExposure: text("executive_exposure"),
  peopleManaged: integer("people_managed"),
  directReportsCurrently: integer("direct_reports_currently"),
  compensationCurrent: doublePrecision("compensation_current"),
  compensationExpected: doublePrecision("compensation_expected"),
  remotePreference: text("remote_preference").notNull().default("FLEXIBLE"),
  relocationOpen: boolean("relocation_open").notNull().default(false),
  industryInterests: text("industry_interests").array().notNull().default([]),
  noticePeriod: integer("notice_period"),
  status: text("status").notNull().default("AVAILABLE"),
  source: text("source").notNull().default("DIRECT_SEARCH"),
  careerVelocity: doublePrecision("career_velocity"),
  profileCompleteness: integer("profile_completeness").notNull().default(0),
  recruiterNotes: text("recruiter_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const experiencesTable = pgTable("experiences", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidatesTable.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  title: text("title").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  promoted: boolean("promoted").notNull().default(false),
  description: text("description"),
  order: integer("order").notNull().default(0),
});

export const skillsTable = pgTable("skills", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidatesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("PRODUCT"),
  proficiency: integer("proficiency").notNull().default(3),
});

export const clientsTable = pgTable("clients", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull(),
  size: text("size"),
  website: text("website"),
  logoUrl: text("logo_url"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const rolesTable = pgTable("roles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  clientId: text("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  level: text("level").notNull().default("IC"),
  department: text("department").notNull().default("PRODUCT"),
  compensationMin: doublePrecision("compensation_min").notNull().default(0),
  compensationMax: doublePrecision("compensation_max").notNull().default(0),
  feePercentage: doublePrecision("fee_percentage").notNull().default(8.33),
  location: text("location"),
  remotePolicy: text("remote_policy").notNull().default("HYBRID"),
  mustHaveSkills: text("must_have_skills").array().notNull().default([]),
  niceToHaveSkills: text("nice_to_have_skills").array().notNull().default([]),
  experienceMin: integer("experience_min").notNull().default(0),
  experienceMax: integer("experience_max").notNull().default(0),
  industryPreference: text("industry_preference").array().notNull().default([]),
  teamContext: text("team_context"),
  successCriteria: text("success_criteria"),
  antiPatterns: text("anti_patterns").array().notNull().default([]),
  impactThreshold: text("impact_threshold"),
  leadershipSignal: text("leadership_signal"),
  cultureFit: text("culture_fit"),
  status: text("status").notNull().default("DISCOVERY"),
  publishedToNetwork: boolean("published_to_network").notNull().default(false),
  maxShortlist: integer("max_shortlist").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const candidateScoresTable = pgTable("candidate_scores", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidatesTable.id, { onDelete: "cascade" }),
  roleId: text("role_id")
    .notNull()
    .references(() => rolesTable.id, { onDelete: "cascade" }),
  roleFitScore: integer("role_fit_score").notNull().default(0),
  evidenceScore: integer("evidence_score").notNull().default(0),
  leadershipScore: integer("leadership_score").notNull().default(0),
  trustScore: integer("trust_score").notNull().default(0),
  evaluationScore: integer("evaluation_score").notNull().default(0),
  compositeScore: doublePrecision("composite_score").notNull().default(0),
  stage: text("stage").notNull().default("SOURCED"),
  recruiterNotes: text("recruiter_notes"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const trustEdgesTable = pgTable("trust_edges", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  fromCandidateId: text("from_candidate_id")
    .notNull()
    .references(() => candidatesTable.id, { onDelete: "cascade" }),
  toCandidateId: text("to_candidate_id")
    .notNull()
    .references(() => candidatesTable.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull().default("WORKED_WITH"),
  strength: integer("strength").notNull().default(3),
  context: text("context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralsTable = pgTable("referrals", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  referrerId: text("referrer_id")
    .notNull()
    .references(() => candidatesTable.id, { onDelete: "cascade" }),
  roleId: text("role_id")
    .notNull()
    .references(() => rolesTable.id, { onDelete: "cascade" }),
  candidateId: text("candidate_id").references(() => candidatesTable.id, {
    onDelete: "set null",
  }),
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email"),
  candidatePhone: text("candidate_phone"),
  candidateLinkedin: text("candidate_linkedin"),
  status: text("status").notNull().default("SUBMITTED"),
  rewardAmount: doublePrecision("reward_amount"),
  rewardPaid: boolean("reward_paid").notNull().default(false),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const placementsTable = pgTable("placements", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  roleId: text("role_id")
    .notNull()
    .references(() => rolesTable.id, { onDelete: "cascade" }),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidatesTable.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  actualCompensation: doublePrecision("actual_compensation").notNull(),
  feePercentage: doublePrecision("fee_percentage").notNull(),
  feeAmount: doublePrecision("fee_amount").notNull(),
  offerDate: date("offer_date", { mode: "string" }),
  joinDate: date("join_date", { mode: "string" }),
  status: text("status").notNull().default("CONFIRMED"),
  guaranteeExpiry: date("guarantee_expiry", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Nullable: invited users have no password until they accept the invite.
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("REFERRER"),
  emailVerified: boolean("email_verified").notNull().default(false),
  // For REFERRER users: links to their node in the talent graph (referrals.referrerId).
  referrerCandidateId: text("referrer_candidate_id").references(
    () => candidatesTable.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Single-use tokens for email verification, password reset, and client invites.
// Only the SHA-256 hash of the token is stored; the raw token is emailed to the user.
export const authTokensTable = pgTable("auth_tokens", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // VERIFY_EMAIL | PASSWORD_RESET | INVITE
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientUsersTable = pgTable("client_users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityTable = pgTable("activity", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CandidateRow = typeof candidatesTable.$inferSelect;
export type ExperienceRow = typeof experiencesTable.$inferSelect;
export type SkillRow = typeof skillsTable.$inferSelect;
export type ClientRow = typeof clientsTable.$inferSelect;
export type RoleRow = typeof rolesTable.$inferSelect;
export type CandidateScoreRow = typeof candidateScoresTable.$inferSelect;
export type TrustEdgeRow = typeof trustEdgesTable.$inferSelect;
export type ReferralRow = typeof referralsTable.$inferSelect;
export type PlacementRow = typeof placementsTable.$inferSelect;
export type ActivityRow = typeof activityTable.$inferSelect;
export type UserRow = typeof usersTable.$inferSelect;
export type ClientUserRow = typeof clientUsersTable.$inferSelect;
export type AuthTokenRow = typeof authTokensTable.$inferSelect;
