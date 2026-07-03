import path from "node:path";
import fs from "node:fs";
import type { Request, Response } from "express";
import { ZipArchive, type ArchiverError } from "archiver";

/**
 * Resolve the monorepo root by walking up from cwd until pnpm-workspace.yaml is found.
 * Falls back to cwd if no marker is located.
 */
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

// Paths excluded from the source export: dependencies, VCS, build output,
// caches, and anything that could carry secrets or internal agent state.
const EXPORT_IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.cache/**",
  "**/.config/**",
  "**/.turbo/**",
  "**/*.tsbuildinfo",
  "**/.DS_Store",
  ".local/**",
  ".agents/**",
  // Secrets / credentials — never include these in an export.
  "**/secrets/**",
  ".env",
  "**/.env",
  "**/.env.*",
  "**/*.pem",
  "**/*.key",
  "**/*.p12",
  "**/*.pfx",
  "**/*.crt",
  "**/id_rsa*",
  "**/.npmrc",
  "**/.netrc",
  "**/.git-credentials",
  "**/*.kubeconfig",
];

/**
 * Stream a zip of the entire monorepo (source + design files) to the response,
 * excluding dependencies, VCS, build output, and secrets. The caller is
 * responsible for authentication/authorization before invoking this.
 */
export function streamSourceArchive(req: Request, res: Response): void {
  const root = findRepoRoot();
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `talent-graph-source-${stamp}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const archive = new ZipArchive({ zlib: { level: 9 } });

  archive.on("warning", (err: ArchiverError) => {
    req.log.warn({ err }, "source-archive warning");
  });
  archive.on("error", (err: ArchiverError) => {
    req.log.error({ err }, "source-archive failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to build source archive" });
    } else {
      res.destroy(err);
    }
  });

  // Stop building the archive if the client disconnects mid-download.
  res.on("close", () => {
    if (!res.writableFinished) archive.abort();
  });

  archive.pipe(res);
  archive.glob("**/*", { cwd: root, dot: true, ignore: EXPORT_IGNORE });
  void archive.finalize();
}
