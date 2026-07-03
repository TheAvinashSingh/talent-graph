import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { streamSourceArchive } from "../lib/source-archive";

const router: IRouter = Router();

/**
 * Public, token-protected project download.
 *
 * Accessible without a login so the owner can grab the full project from a
 * single link, but gated by a secret token (PROJECT_DOWNLOAD_TOKEN) so the
 * source is not world-readable. Returns 503 if no token is configured.
 */
router.get("/download/project", (req, res): void => {
  const expected = process.env.PROJECT_DOWNLOAD_TOKEN;
  if (!expected) {
    res
      .status(503)
      .json({ error: "Project download is not configured (no token set)" });
    return;
  }

  const provided = typeof req.query.token === "string" ? req.query.token : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ error: "Invalid or missing download token" });
    return;
  }

  streamSourceArchive(req, res);
});

export default router;
