#!/usr/bin/env bun
/**
 * Affected-package detector for CI.
 *
 * Prints the GitHub Actions matrix of workspace packages whose checks must run
 * for the current change set:
 *
 *   - every package that changed, plus
 *   - every package that (transitively) depends on a changed one.
 *
 * So a change to `lib/core` re-runs `linlin-server` (which imports it), but a
 * change to `lib/ui` leaves `linlin-server` alone (it doesn't). Files that
 * belong to no package (the lockfile, root config, the CI workflow itself) are
 * treated as "global" and re-run everything.
 *
 * Output (stdout) is a matrix object consumed by `.github/workflows/app-ci.yml`:
 *
 *   {"include":[{"name":"crocus","scripts":"typecheck lint build test"}, ...]}
 *
 * Each entry lists only the checks that package actually defines, in the order
 * CI should run them. A package with no checks (e.g. `@monsieurtis/tsconfig`)
 * never appears.
 *
 * Usage: `bun scripts/affected.ts [baseRef]`   (baseRef defaults to origin/main)
 */
import { $, Glob } from "bun";
import { dirname, resolve } from "node:path";

/** Prep scripts run before the checks (e.g. generate the Prisma client). */
const PREP_SCRIPTS = ["prisma:generate"];
/** The checks CI knows how to run, in execution order. */
const CHECK_SCRIPTS = ["typecheck", "lint", "build", "test", "prisma:validate"];

const repoRoot = resolve(import.meta.dir, "..");

interface Package {
    name: string;
    /** Directory relative to the repo root, POSIX-style, e.g. "apps/crocus". */
    dir: string;
    /** Names of the workspace packages this one depends on. */
    internalDeps: string[];
    /** Script names defined in this package's package.json. */
    scripts: string[];
}

/** Read every workspace package.json declared in the root `workspaces.packages`. */
async function discoverPackages(): Promise<Package[]> {
    const root = await Bun.file(`${repoRoot}/package.json`).json();
    const patterns: string[] = root.workspaces.packages;

    // Expand each workspace pattern (exact dir or glob) to its package.json paths.
    const manifestPaths = new Set<string>();
    for (const pattern of patterns) {
        const glob = new Glob(`${pattern}/package.json`);
        for await (const path of glob.scan({ cwd: repoRoot })) {
            manifestPaths.add(path);
        }
    }

    const manifests = await Promise.all(
        [...manifestPaths].map(async (path) => ({
            dir: dirname(path),
            json: await Bun.file(`${repoRoot}/${path}`).json(),
        })),
    );

    // The set of workspace names lets us keep only *internal* dependencies.
    const workspaceNames = new Set(
        manifests.map((m) => m.json.name).filter(Boolean),
    );

    return manifests
        .filter((m) => m.json.name)
        .map((m) => {
            const deps = { ...m.json.dependencies, ...m.json.devDependencies };
            return {
                name: m.json.name,
                dir: m.dir,
                internalDeps: Object.keys(deps).filter((d) =>
                    workspaceNames.has(d),
                ),
                scripts: Object.keys(m.json.scripts ?? {}),
            };
        });
}

/** Files changed between the merge-base of `baseRef` and HEAD. */
async function changedFiles(baseRef: string): Promise<string[]> {
    const mergeBase = (await $`git merge-base ${baseRef} HEAD`.text()).trim();
    const diff = await $`git diff --name-only ${mergeBase} HEAD`.text();
    return diff.split("\n").filter(Boolean);
}

/** The package that owns a file = the one whose dir is its longest path prefix. */
function ownerOf(file: string, packages: Package[]): Package | undefined {
    return packages
        .filter((p) => file === p.dir || file.startsWith(`${p.dir}/`))
        .sort((a, b) => b.dir.length - a.dir.length)[0];
}

/** Names of all packages affected by the change set (changed + their dependents). */
function affectedPackages(
    changed: Set<string>,
    packages: Package[],
): Set<string> {
    // Reverse the dependency graph: package -> packages that depend on it.
    const dependents = new Map<string, Set<string>>();
    for (const p of packages) {
        for (const dep of p.internalDeps) {
            (
                dependents.get(dep) ?? dependents.set(dep, new Set()).get(dep)!
            ).add(p.name);
        }
    }

    // Walk dependents breadth-first from each changed package.
    const affected = new Set<string>();
    const queue = [...changed];
    while (queue.length > 0) {
        const name = queue.shift()!;
        if (affected.has(name)) continue;
        affected.add(name);
        queue.push(...(dependents.get(name) ?? []));
    }
    return affected;
}

const baseRef = process.argv[2] ?? "origin/main";
const packages = await discoverPackages();
const files = await changedFiles(baseRef);

// Map changed files to their owning packages; files under no package are global.
let globalChange = false;
const changed = new Set<string>();
for (const file of files) {
    const owner = ownerOf(file, packages);
    if (owner) changed.add(owner.name);
    else globalChange = true;
}

const affected = globalChange
    ? new Set(packages.map((p) => p.name))
    : affectedPackages(changed, packages);

// Build one matrix entry per affected package that has at least one check,
// listing its prep + check scripts in execution order.
const include = packages
    .filter((p) => affected.has(p.name))
    .map((p) => ({
        name: p.name,
        scripts: [...PREP_SCRIPTS, ...CHECK_SCRIPTS].filter((s) =>
            p.scripts.includes(s),
        ),
    }))
    .filter((entry) => entry.scripts.some((s) => CHECK_SCRIPTS.includes(s)))
    .map((entry) => ({ name: entry.name, scripts: entry.scripts.join(" ") }))
    .sort((a, b) => a.name.localeCompare(b.name));

console.log(JSON.stringify({ include }));
