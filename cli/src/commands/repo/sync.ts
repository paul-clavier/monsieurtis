import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import type { Command } from "../../command";
import { error, info } from "../../utils/log";
import { repoPath } from "../../utils/paths";
import {
    bunVersion,
    dependencyClosure,
    discoverPackages,
} from "../../utils/workspace";

interface FileSync {
    /** Repo-relative path. */
    path: string;
    render: (current: string) => string;
}

/**
 * A generated block in a Dockerfile, between a begin and an end marker:
 *
 *   # >>> tis repo sync: workspace sources[, deps only][, from=<stage>:<root>] (generated, do not edit)
 *   COPY …
 *   # <<< tis repo sync
 *
 * The block gets one COPY per workspace package the image's package
 * (transitively) depends on, the package itself last so edits to its sources
 * don't bust the cache of the lib layers. `deps only` leaves the package
 * itself out; `from=build:/app` copies from that stage's filesystem instead
 * of the build context.
 */
const BLOCK =
    /^(# >>> tis repo sync: workspace sources(, deps only)?(?:, from=(\S+?):(\S+))? \(generated, do not edit\)\n)[\s\S]*?(^# <<< tis repo sync$)/gm;

const dockerfileCopyBlocks = (current: string, dirs: string[]): string =>
    current.replace(
        BLOCK,
        (
            _match,
            begin: string,
            depsOnly: string | undefined,
            stage: string | undefined,
            root: string | undefined,
            end: string,
        ) => {
            const selected = depsOnly ? dirs.slice(0, -1) : dirs;
            const copies = selected.map((d) =>
                stage
                    ? `COPY --from=${stage} ${root}/${d} ${d}`
                    : `COPY ${d} ${d}`,
            );
            return `${begin}${copies.map((c) => `${c}\n`).join("")}${end}`;
        },
    );

const replaceLine = (current: string, pattern: RegExp, line: string) =>
    current.replace(pattern, line);

/** Every file whose content is derived from the workspace graph or the bun version. */
const collectSyncs = async (): Promise<FileSync[]> => {
    const version = await bunVersion();
    const packages = await discoverPackages();
    const syncs: FileSync[] = [];

    for (const pkg of packages) {
        const path = `${pkg.dir}/Dockerfile`;
        if (!existsSync(repoPath(path))) continue;
        const dirs = dependencyClosure(pkg.name, packages).map((p) => p.dir);
        syncs.push({
            path,
            render: (current) =>
                replaceLine(
                    dockerfileCopyBlocks(current, dirs),
                    /^ARG BUN_VERSION=.*$/m,
                    `ARG BUN_VERSION=${version}`,
                ),
        });
    }

    syncs.push({
        path: "mise.toml",
        render: (current) =>
            replaceLine(current, /^bun = ".*"$/m, `bun = "${version}"`),
    });

    // @types/bun follows the runtime it describes.
    syncs.push({
        path: "package.json",
        render: (current) =>
            replaceLine(
                current,
                /("@types\/bun": )"\d+\.\d+\.\d+"/,
                `$1"${version}"`,
            ),
    });

    return syncs;
};

/**
 * `tis repo sync [--check]`
 *
 * Regenerates what must mirror the workspace graph or the bun version pinned
 * in the root package.json `packageManager`: Dockerfile COPY lists and
 * `ARG BUN_VERSION`, mise.toml's bun, the `@types/bun` catalog entry.
 * `--check` writes nothing and fails if anything is out of date (CI).
 */
export const sync: Command = {
    name: "sync",
    description:
        "Regenerate Dockerfile COPY lists and bun version pins (--check for CI)",
    run: async (args) => {
        let check: boolean;
        try {
            check =
                parseArgs({
                    args,
                    options: { check: { type: "boolean" } },
                }).values.check ?? false;
        } catch (e) {
            error((e as Error).message);
            return 1;
        }

        const stale: string[] = [];
        for (const { path, render } of await collectSyncs()) {
            const file = Bun.file(repoPath(path));
            const current = await file.text();
            const next = render(current);
            if (next === current) continue;
            stale.push(path);
            if (!check) await Bun.write(file, next);
        }

        if (stale.length === 0) {
            info("everything in sync");
            return 0;
        }
        if (check) {
            error(
                `out of date (run \`tis repo sync\`):\n${stale.map((p) => `  ${p}`).join("\n")}`,
            );
            return 1;
        }
        info(`updated:\n${stale.map((p) => `  ${p}`).join("\n")}`);
        return 0;
    },
};
