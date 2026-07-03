import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import portalRouter from "./portal";
import clientPortalRouter from "./client-portal";
import candidatesRouter from "./candidates";
import rolesRouter from "./roles";
import clientsRouter from "./clients";
import scoresRouter from "./scores";
import trustRouter from "./trust";
import referralsRouter from "./referrals";
import placementsRouter from "./placements";
import analyticsRouter from "./analytics";
import adminRouter from "./admin";
import downloadRouter from "./download";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

// Public.
router.use(healthRouter);
router.use("/auth", authRouter);
router.use(downloadRouter);

// Role-scoped portals.
router.use("/portal", requireAuth, requireRole("REFERRER"), portalRouter);
router.use("/client-portal", requireAuth, requireRole("CLIENT"), clientPortalRouter);

// All remaining management routes are admin-only.
router.use(requireAuth, requireRole("ADMIN"));
router.use(candidatesRouter);
router.use(rolesRouter);
router.use(clientsRouter);
router.use(scoresRouter);
router.use(trustRouter);
router.use(referralsRouter);
router.use(placementsRouter);
router.use(analyticsRouter);
router.use(adminRouter);

export default router;
