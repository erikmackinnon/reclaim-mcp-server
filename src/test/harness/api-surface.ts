import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ParsedEndpoint = {
  method: string;
  pathTemplate: string;
};

const ENDPOINT_LINE_REGEX = /^\s*(GET|POST|PUT|PATCH|DELETE)\s+([^\s`]+)/;

export function resolveApiSurfacePath(): string {
  const harnessDir = dirname(fileURLToPath(import.meta.url));
  const worktreeCandidate = resolve(harnessDir, "../../../API-SURFACE.md");
  if (existsSync(worktreeCandidate)) {
    return worktreeCandidate;
  }

  const gitPointerPath = resolve(harnessDir, "../../../.git");
  if (existsSync(gitPointerPath)) {
    try {
      const gitPointer = readFileSync(gitPointerPath, "utf8");
      const match = gitPointer.match(/^gitdir:\s*(.+)$/m);
      if (match) {
        const gitDir = resolve(harnessDir, "../../..", match[1].trim());
        const commonDir = resolve(gitDir, "../..");
        const commonWorktreeCandidate = join(commonDir, "..", "API-SURFACE.md");
        if (existsSync(commonWorktreeCandidate)) {
          return commonWorktreeCandidate;
        }
      }
    } catch {
      // `.git` can be a directory in a non-worktree checkout.
    }
  }

  throw new Error(
    `Unable to locate API-SURFACE.md. Checked: ${worktreeCandidate} and git-common-dir fallback.`,
  );
}

export function parseApiSurfaceEndpoints(markdown: string): ParsedEndpoint[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(ENDPOINT_LINE_REGEX))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      method: match[1],
      pathTemplate: match[2].replace(/\?\{q\}$/, "").trim(),
    }))
    .filter((endpoint) => endpoint.pathTemplate.startsWith("/"));
}

export function endpointSignature(endpoint: ParsedEndpoint): string {
  return `${endpoint.method} ${endpoint.pathTemplate}`;
}
