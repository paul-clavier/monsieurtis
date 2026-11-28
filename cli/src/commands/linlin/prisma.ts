import { requireEnvVar } from "../../utils/env";
import { error } from "../../utils/log";
import { repoPath } from "../../utils/paths";
import { run } from "../../utils/process";

export const SERVER_DIR = repoPath("apps/linlin/linlin-server");
export const ENV_FILE = repoPath("apps/linlin/.env");
export const SCHEMA_FILE = `${SERVER_DIR}/src/infrastructure/prisma/schema.prisma`;
export const MIGRATIONS_DIR = `${SERVER_DIR}/src/infrastructure/prisma/migrations`;

/**
 * Runs the server's prisma CLI (config comes from its prisma.config.ts).
 * With `needsDatabase`, DATABASE_URL is read from apps/linlin/.env and passed on.
 */
export const runPrisma = async (
    args: string[],
    options: { needsDatabase: boolean },
): Promise<number> => {
    let env: Record<string, string> = {};
    if (options.needsDatabase) {
        const url = requireEnvVar(ENV_FILE, "DATABASE_URL");
        if ("error" in url) {
            error(url.error);
            return 1;
        }
        env = { DATABASE_URL: url.value };
    }
    return run(["bunx", "prisma", ...args], { cwd: SERVER_DIR, env });
};
