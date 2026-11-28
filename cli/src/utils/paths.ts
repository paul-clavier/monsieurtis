import { resolve } from "node:path";

/** Absolute path of the monorepo root (this file lives in cli/src/utils). */
export const REPO_ROOT = resolve(import.meta.dir, "../../..");

export const repoPath = (...segments: string[]): string =>
    resolve(REPO_ROOT, ...segments);
