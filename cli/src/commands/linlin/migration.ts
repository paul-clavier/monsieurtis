import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    rmSync,
} from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { Command } from "../../command";
import { error, info } from "../../utils/log";
import { MIGRATIONS_DIR, SCHEMA_FILE, runPrisma } from "./prisma";

/** Each migration folder keeps a copy of the schema it produced, so the next diff needs no database. */
const SNAPSHOT_FILE = "schema.prisma";

const timestamp = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
        `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
    );
};

/** Migration folders, oldest first. */
const listMigrations = (): string[] => {
    if (!existsSync(MIGRATIONS_DIR)) return [];
    return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
};

/**
 * Creates `<timestamp>_<name>/migration.sql` with the diff between the latest
 * migration's schema snapshot (or an empty schema for the first one) and the
 * current schema.prisma. Runs fully offline: no database is needed.
 */
const createMigration = async (name: string): Promise<number> => {
    const folderName = `${timestamp(new Date())}_${name}`;
    const folder = join(MIGRATIONS_DIR, folderName);
    if (existsSync(folder)) {
        error(`${folderName} already exists`);
        return 1;
    }

    const previous = listMigrations().at(-1);
    const previousSnapshot =
        previous && join(MIGRATIONS_DIR, previous, SNAPSHOT_FILE);
    if (previousSnapshot && !existsSync(previousSnapshot)) {
        error(
            `${previous} has no ${SNAPSHOT_FILE} snapshot, so the diff base is unknown. ` +
                "Add the schema it produced as that file, then retry.",
        );
        return 1;
    }
    const from = previousSnapshot
        ? ["--from-schema", previousSnapshot]
        : ["--from-empty"];

    mkdirSync(folder, { recursive: true });
    const sqlPath = join(folder, "migration.sql");
    const code = await runPrisma(
        [
            "migrate",
            "diff",
            ...from,
            "--to-schema",
            SCHEMA_FILE,
            "--script",
            "--output",
            sqlPath,
        ],
        { needsDatabase: false },
    );
    if (code !== 0) {
        rmSync(folder, { recursive: true, force: true });
        return code;
    }

    // Prisma writes this marker instead of an empty file when there is no diff.
    const sql = (await Bun.file(sqlPath).text())
        .replace(/^-- This is an empty migration\.?\s*$/m, "")
        .trim();
    if (!sql) {
        rmSync(folder, { recursive: true, force: true });
        info("no schema changes since the last migration, nothing created");
        return 0;
    }

    copyFileSync(SCHEMA_FILE, join(folder, SNAPSHOT_FILE));
    info(`created src/infrastructure/prisma/migrations/${folderName}`);
    return 0;
};

export const migrationNew: Command = {
    name: "migration-new",
    description: "Create a migration from schema changes (--name <name>)",
    run: async (args) => {
        let name: string | undefined;
        try {
            ({
                values: { name },
            } = parseArgs({
                args,
                options: { name: { type: "string" } },
            }));
        } catch (e) {
            error((e as Error).message);
            return 1;
        }
        if (!name) {
            error(
                "missing --name, e.g. tis linlin migration-new --name add_tags",
            );
            return 1;
        }
        const slug = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
        if (!slug) {
            error(`invalid --name "${name}"`);
            return 1;
        }
        info(`creating migration "${slug}"…`);
        return createMigration(slug);
    },
};

/** Applies all pending migrations to the DATABASE_URL in apps/linlin/.env. */
export const migrationApply: Command = {
    name: "migration-apply",
    description:
        "Apply pending migrations to DATABASE_URL from apps/linlin/.env",
    run: async () => {
        info("applying pending migrations…");
        return runPrisma(["migrate", "deploy"], { needsDatabase: true });
    },
};
