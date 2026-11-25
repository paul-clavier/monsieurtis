import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { info } from "./log";
import { REPO_ROOT } from "./paths";

const TEMPLATES_DIR = resolve(import.meta.dir, "../templates/entity");

const pascalToCamel = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const pluralize = (s: string) =>
    s.endsWith("y") ? s.slice(0, -1) + "ies" : s + "s";
const pascalToScreaming = (s: string) =>
    s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

const render = (template: string, vars: Record<string, string>): string => {
    let out = readFileSync(join(TEMPLATES_DIR, template), "utf8");
    for (const [k, v] of Object.entries(vars)) {
        out = out.replaceAll(`{{${k}}}`, v);
    }
    return out;
};

const writeIfNew = (path: string, content: string): boolean => {
    const shown = relative(REPO_ROOT, path);
    if (existsSync(path)) {
        console.log(`  skip   ${shown} (already exists)`);
        return false;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
    console.log(`  create ${shown}`);
    return true;
};

export interface ScaffoldOptions {
    /** PascalCase entity name, e.g. "Recipe". */
    entity: string;
    /** Absolute path of the NestJS server package. */
    serverDir: string;
    /** Absolute path of the app's interfaces package. */
    interfacesDir: string;
}

/**
 * Scaffolds the per-entity boilerplate hanging off CommonUseCases /
 * CommonControllerMixin: interface entity, Prisma repository, use cases,
 * domain module, schemas, controller, presentation module. Never overwrites.
 */
export const scaffoldEntity = ({
    entity: Entity,
    serverDir,
    interfacesDir,
}: ScaffoldOptions): void => {
    const camel = pascalToCamel(Entity);
    const ENTITY = pascalToScreaming(Entity);
    const interfacesPackage = (
        JSON.parse(
            readFileSync(join(interfacesDir, "package.json"), "utf8"),
        ) as { name: string }
    ).name;
    const vars = {
        Entity,
        entity: camel,
        entities: pluralize(camel),
        ENTITY,
        interfacesPackage,
    };

    const src = join(serverDir, "src");
    const api = join(src, "presentation", "api", "internal", camel);
    const targets: Array<[template: string, output: string]> = [
        [
            "entity.entity.ts.tmpl",
            join(interfacesDir, "domain", `${camel}.entity.ts`),
        ],
        [
            "entity.repository.ts.tmpl",
            join(
                src,
                "infrastructure",
                "prisma",
                "repositories",
                `${camel}.repository.ts`,
            ),
        ],
        [
            "entity.use-cases.ts.tmpl",
            join(src, "domain", camel, `${camel}.use-cases.ts`),
        ],
        [
            "entity.domain.module.ts.tmpl",
            join(src, "domain", camel, `${camel}.module.ts`),
        ],
        ["entity.schemas.ts.tmpl", join(api, `${camel}.schemas.ts`)],
        ["entity.controller.ts.tmpl", join(api, `${camel}.controller.ts`)],
        ["entity.internal.module.ts.tmpl", join(api, `${camel}.module.ts`)],
    ];

    let created = 0;
    for (const [template, output] of targets) {
        if (writeIfNew(output, render(template, vars))) created++;
    }

    info(
        `${created} files created. Next steps:\n` +
            `  1. Add the Prisma model + run a migration\n` +
            `  2. Register Prisma${Entity}Repository in RepositoriesModule\n` +
            `  3. Add ${ENTITY}_REPOSITORY to domain/injection-tokens.ts\n` +
            `  4. Import ${Entity}InternalModule in AppModule`,
    );
};
