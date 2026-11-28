import { $, Glob } from "bun";
import { dirname } from "node:path";
import { REPO_ROOT } from "./paths";

/** A workspace package, as declared by the root `workspaces.packages`. */
export interface Package {
    name: string;
    /** Directory relative to the repo root, POSIX-style, e.g. "apps/crocus". */
    dir: string;
    /** Names of the workspace packages this one depends on (deps + devDeps). */
    internalDeps: string[];
    /** Script names defined in this package's package.json. */
    scripts: string[];
    manifest: PackageJson;
}

export interface PackageJson {
    name?: string;
    packageManager?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    workspaces?: {
        packages: string[];
        catalogs?: Record<string, Record<string, string>>;
    };
}

export const readRootManifest = async (): Promise<PackageJson> =>
    Bun.file(`${REPO_ROOT}/package.json`).json() as Promise<PackageJson>;

/** Every workspace package declared in the root `workspaces.packages`. */
export const discoverPackages = async (): Promise<Package[]> => {
    const root = await readRootManifest();
    const patterns = root.workspaces?.packages ?? [];

    const manifestPaths = new Set<string>();
    for (const pattern of patterns) {
        const glob = new Glob(`${pattern}/package.json`);
        for await (const path of glob.scan({ cwd: REPO_ROOT })) {
            manifestPaths.add(path);
        }
    }

    const manifests = await Promise.all(
        [...manifestPaths].map(async (path) => ({
            dir: dirname(path),
            json: (await Bun.file(
                `${REPO_ROOT}/${path}`,
            ).json()) as PackageJson,
        })),
    );

    const workspaceNames = new Set(
        manifests.map((m) => m.json.name).filter(Boolean),
    );

    return manifests
        .filter((m) => m.json.name)
        .map((m) => {
            const deps = { ...m.json.dependencies, ...m.json.devDependencies };
            return {
                name: m.json.name!,
                dir: m.dir,
                internalDeps: Object.keys(deps).filter((d) =>
                    workspaceNames.has(d),
                ),
                scripts: Object.keys(m.json.scripts ?? {}),
                manifest: m.json,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
};

/** Files changed between the merge-base of `baseRef` and the working tree. */
export const changedFiles = async (
    baseRef: string,
    { includeWorkingTree }: { includeWorkingTree: boolean },
): Promise<string[]> => {
    const mergeBase = (
        await $`git -C ${REPO_ROOT} merge-base ${baseRef} HEAD`.text()
    ).trim();
    // CI diffs commits only; locally, uncommitted and untracked work counts too.
    const committed = includeWorkingTree
        ? await $`git -C ${REPO_ROOT} diff --name-only ${mergeBase}`.text()
        : await $`git -C ${REPO_ROOT} diff --name-only ${mergeBase} HEAD`.text();
    const untracked = includeWorkingTree
        ? await $`git -C ${REPO_ROOT} ls-files --others --exclude-standard`.text()
        : "";
    return [
        ...new Set(`${committed}\n${untracked}`.split("\n").filter(Boolean)),
    ];
};

/** The package that owns a file = the one whose dir is its longest path prefix. */
export const ownerOf = (
    file: string,
    packages: Package[],
): Package | undefined =>
    packages
        .filter((p) => file === p.dir || file.startsWith(`${p.dir}/`))
        .sort((a, b) => b.dir.length - a.dir.length)[0];

/** Changed packages plus everything that (transitively) depends on them. */
export const dependentsClosure = (
    changed: Iterable<string>,
    packages: Package[],
): Set<string> => {
    const dependents = new Map<string, Set<string>>();
    for (const p of packages) {
        for (const dep of p.internalDeps) {
            let set = dependents.get(dep);
            if (!set) dependents.set(dep, (set = new Set()));
            set.add(p.name);
        }
    }
    const result = new Set<string>();
    const queue = [...changed];
    while (queue.length > 0) {
        const name = queue.shift()!;
        if (result.has(name)) continue;
        result.add(name);
        queue.push(...(dependents.get(name) ?? []));
    }
    return result;
};

/**
 * A package plus every workspace package it (transitively) depends on, in
 * dependency order: leaves first, the package itself last.
 */
export const dependencyClosure = (
    name: string,
    packages: Package[],
): Package[] => {
    const byName = new Map(packages.map((p) => [p.name, p]));
    const ordered: Package[] = [];
    const seen = new Set<string>();
    const visit = (n: string) => {
        if (seen.has(n)) return;
        seen.add(n);
        const pkg = byName.get(n);
        if (!pkg) return;
        for (const dep of [...pkg.internalDeps].sort()) visit(dep);
        ordered.push(pkg);
    };
    visit(name);
    return ordered;
};

/** Bun version from the root `packageManager` field — the single source of truth. */
export const bunVersion = async (): Promise<string> => {
    const pm = (await readRootManifest()).packageManager ?? "";
    const match = /^bun@(\d+\.\d+\.\d+)$/.exec(pm);
    if (!match) {
        throw new Error(
            `root package.json "packageManager" must be "bun@x.y.z", got "${pm}"`,
        );
    }
    return match[1]!;
};
