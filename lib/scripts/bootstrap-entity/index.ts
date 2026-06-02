#!/usr/bin/env bun
/**
 * Scaffolds the per-entity boilerplate that hangs off CommonUseCases /
 * CommonControllerMixin.
 *
 * Usage:
 *   bun run lib/scripts/scaffold-entity.ts <Entity> --app=<server-name>
 *
 * Examples:
 *   bun run lib/scripts/scaffold-entity.ts Ingredient --app=linlin-server
 *   bun run lib/scripts/scaffold-entity.ts Recipe --app=linlin-server
 *
 * After it runs you still need to:
 *   1. Add the Prisma model + run a migration.
 *   2. Add the new repository class to RepositoriesModule providers/exports.
 *   3. Add a token entry to domain/injection-tokens.ts.
 *   4. Wire the {{Entity}}InternalModule into AppModule's `imports`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

interface Args {
    entity: string;
    app: string;
}

const parseArgs = (argv: string[]): Args => {
    let entity: string | undefined;
    let app: string | undefined;
    for (const arg of argv.slice(2)) {
        if (arg.startsWith("--app=")) app = arg.slice("--app=".length);
        else if (!entity) entity = arg;
    }
    if (!entity || !app) {
        console.error(
            "Usage: bun run lib/scripts/bootstrap-entity/index.ts <Entity> --app=<server-name>",
        );
        process.exit(1);
    }
    return { entity, app };
};

const pascalToCamel = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const pluralize = (s: string) =>
    s.endsWith("y") ? s.slice(0, -1) + "ies" : s + "s";
const pascalToScreaming = (s: string) =>
    s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

const renderTemplate = (
    templatePath: string,
    vars: Record<string, string>,
): string => {
    let out = readFileSync(templatePath, "utf8");
    for (const [k, v] of Object.entries(vars)) {
        out = out.replaceAll(`{{${k}}}`, v);
    }
    return out;
};

const writeIfNew = (path: string, content: string): boolean => {
    if (existsSync(path)) {
        console.log(`  skip   ${path} (already exists)`);
        return false;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
    console.log(`  create ${path}`);
    return true;
};

const findApp = (appName: string): string => {
    const repoRoot = resolve(import.meta.dir, "..", "..");
    const direct = join(repoRoot, "apps", appName);
    if (existsSync(direct)) return direct;
    // Nested layout (e.g. apps/linlin/linlin-server)
    for (const parent of ["linlin", "harley"]) {
        const nested = join(repoRoot, "apps", parent, appName);
        if (existsSync(nested)) return nested;
    }
    console.error(`Could not find app at apps/${appName} or under apps/*`);
    process.exit(1);
};

const main = () => {
    const { entity, app } = parseArgs(process.argv);
    const Entity = entity;
    const camel = pascalToCamel(Entity);
    const entities = pluralize(camel);
    const ENTITY = pascalToScreaming(Entity);

    const appDir = findApp(app);
    const interfacesDir = resolve(appDir, "..", "interfaces");
    const hasInterfaces = existsSync(interfacesDir);

    const templatesDir = resolve(import.meta.dir, "templates");
    const vars = { Entity, entity: camel, entities, ENTITY };

    const targets: Array<{ template: string; output: string }> = [
        {
            template: join(templatesDir, "entity.entity.ts.tmpl"),
            output: hasInterfaces
                ? join(interfacesDir, "domain", `${camel}.entity.ts`)
                : join(appDir, "src", "domain", `${camel}.entity.ts`),
        },
        {
            template: join(templatesDir, "entity.repository.ts.tmpl"),
            output: join(
                appDir,
                "src",
                "infrastructure",
                "prisma",
                "repositories",
                `${camel}.repository.ts`,
            ),
        },
        {
            template: join(templatesDir, "entity.use-cases.ts.tmpl"),
            output: join(
                appDir,
                "src",
                "domain",
                camel,
                `${camel}.use-cases.ts`,
            ),
        },
        {
            template: join(templatesDir, "entity.domain.module.ts.tmpl"),
            output: join(appDir, "src", "domain", camel, `${camel}.module.ts`),
        },
        {
            template: join(templatesDir, "entity.schemas.ts.tmpl"),
            output: join(
                appDir,
                "src",
                "presentation",
                "api",
                "internal",
                camel,
                `${camel}.schemas.ts`,
            ),
        },
        {
            template: join(templatesDir, "entity.controller.ts.tmpl"),
            output: join(
                appDir,
                "src",
                "presentation",
                "api",
                "internal",
                camel,
                `${camel}.controller.ts`,
            ),
        },
        {
            template: join(templatesDir, "entity.internal.module.ts.tmpl"),
            output: join(
                appDir,
                "src",
                "presentation",
                "api",
                "internal",
                camel,
                `${camel}.module.ts`,
            ),
        },
    ];

    let created = 0;
    for (const { template, output } of targets) {
        const content = renderTemplate(template, vars);
        if (writeIfNew(output, content)) created++;
    }

    console.log(
        `\n${created} files created. Next steps:\n` +
            `  1. Add the Prisma model + run a migration\n` +
            `  2. Register Prisma${Entity}Repository in RepositoriesModule\n` +
            `  3. Add ${ENTITY}_REPOSITORY to domain/injection-tokens.ts\n` +
            `  4. Import ${Entity}InternalModule in AppModule\n`,
    );
};

main();
