import { parseArgs } from "node:util";
import type { Command } from "../../command";
import { error, info, paint } from "../../utils/log";
import { REPO_ROOT } from "../../utils/paths";
import { run } from "../../utils/process";
import {
    changedFiles,
    dependentsClosure,
    discoverPackages,
    ownerOf,
} from "../../utils/workspace";

/** Prep scripts run before the checks (e.g. generate the Prisma client). */
const PREP_SCRIPTS = ["prisma:generate"];
/** The checks CI runs, in execution order. */
const CHECK_SCRIPTS = ["typecheck", "lint", "build", "test", "prisma:validate"];

interface Entry {
    name: string;
    scripts: string[];
}

/**
 * Workspace packages whose checks must run for the change set: every package
 * that changed, plus every package that (transitively) depends on one. Files
 * owned by no package (lockfile, root config, CI) are global: everything runs.
 */
const computeAffected = async (
    base: string,
    includeWorkingTree: boolean,
): Promise<Entry[]> => {
    const packages = await discoverPackages();
    const files = await changedFiles(base, { includeWorkingTree });

    let globalChange = false;
    const changed = new Set<string>();
    for (const file of files) {
        const owner = ownerOf(file, packages);
        if (owner) changed.add(owner.name);
        else globalChange = true;
    }

    const affected = globalChange
        ? new Set(packages.map((p) => p.name))
        : dependentsClosure(changed, packages);

    return packages
        .filter((p) => affected.has(p.name))
        .map((p) => ({
            name: p.name,
            scripts: [...PREP_SCRIPTS, ...CHECK_SCRIPTS].filter((s) =>
                p.scripts.includes(s),
            ),
        }))
        .filter((e) => e.scripts.some((s) => CHECK_SCRIPTS.includes(s)));
};

/**
 * `tis repo affected [--base <ref>] [--run] [--json]`
 *
 *   (default)  list affected packages and the checks CI would run for them
 *   --run      run those checks locally, like CI does
 *   --json     print the GitHub Actions matrix (used by app-ci.yml); committed
 *              changes only, exactly what a PR contains
 */
export const affected: Command = {
    name: "affected",
    description:
        "Packages affected by your changes (--run to run CI's checks, --json for CI)",
    run: async (args) => {
        let values: { base?: string; run?: boolean; json?: boolean };
        try {
            ({ values } = parseArgs({
                args,
                options: {
                    base: { type: "string", default: "origin/main" },
                    run: { type: "boolean", default: false },
                    json: { type: "boolean", default: false },
                },
            }));
        } catch (e) {
            error((e as Error).message);
            return 1;
        }
        const base = values.base!;

        const entries = await computeAffected(base, !values.json);

        if (values.json) {
            const include = entries.map((e) => ({
                name: e.name,
                scripts: e.scripts.join(" "),
            }));
            console.log(JSON.stringify({ include }));
            return 0;
        }

        if (entries.length === 0) {
            info(`nothing affected since ${base}`);
            return 0;
        }

        info(`affected since ${base} (including uncommitted changes):`);
        const width = Math.max(...entries.map((e) => e.name.length));
        for (const e of entries) {
            console.log(
                `  ${e.name.padEnd(width)}  ${paint("dim", e.scripts.join(" "))}`,
            );
        }
        if (!values.run) return 0;

        const failures: string[] = [];
        for (const e of entries) {
            for (const script of e.scripts) {
                info(`${e.name} › ${script}`);
                const code = await run(
                    ["bun", "run", "--filter", e.name, script],
                    { cwd: REPO_ROOT },
                );
                if (code !== 0) {
                    failures.push(`${e.name} › ${script}`);
                    // Later checks of this package depend on earlier ones
                    // (e.g. build needs prisma:generate): skip the rest.
                    break;
                }
            }
        }

        if (failures.length > 0) {
            error(`failed:\n${failures.map((f) => `  ${f}`).join("\n")}`);
            return 1;
        }
        info("all checks passed");
        return 0;
    },
};
