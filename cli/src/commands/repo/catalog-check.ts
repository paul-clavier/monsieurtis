import type { Command } from "../../command";
import { error, info } from "../../utils/log";
import { discoverPackages, readRootManifest } from "../../utils/workspace";

const SECTIONS = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
] as const;

/**
 * `tis repo catalog-check`
 *
 * Fails when an external dependency declared by 2+ packages (root included)
 * is pinned directly somewhere instead of through a root catalog: shared
 * versions must live in one place.
 */
export const catalogCheck: Command = {
    name: "catalog-check",
    description:
        "Fail if a dependency shared by 2+ packages bypasses the catalog",
    run: async () => {
        const packages = await discoverPackages();
        const root = await readRootManifest();
        const consumers = [
            { name: "(root)", manifest: root },
            ...packages.map((p) => ({ name: p.name, manifest: p.manifest })),
        ];

        // dependency → [package, spec] for every declaration of it
        const usages = new Map<string, Array<[string, string]>>();
        for (const { name, manifest } of consumers) {
            for (const section of SECTIONS) {
                for (const [dep, spec] of Object.entries(
                    manifest[section] ?? {},
                )) {
                    if (spec.startsWith("workspace:")) continue;
                    const list = usages.get(dep) ?? [];
                    list.push([name, spec]);
                    usages.set(dep, list);
                }
            }
        }

        const violations: string[] = [];
        for (const [dep, list] of [...usages].sort(([a], [b]) =>
            a.localeCompare(b),
        )) {
            const owners = new Set(list.map(([name]) => name));
            if (owners.size < 2) continue;
            const direct = list.filter(
                ([, spec]) => !spec.startsWith("catalog:"),
            );
            for (const [name, spec] of direct) {
                violations.push(`${dep}: "${spec}" in ${name}`);
            }
        }

        if (violations.length > 0) {
            error(
                `shared dependencies pinned outside a catalog (move them to a root catalog):\n${violations.map((v) => `  ${v}`).join("\n")}`,
            );
            return 1;
        }
        info("every shared dependency goes through a catalog");
        return 0;
    },
};
