---
name: bootstrap-new-app
description: Checklist for adding a new app or library to the monorepo so it plugs into CI automatically. Use when creating a new workspace package under apps/ or lib/ — covers the required package.json scripts (the "script contract"), eslint/tsconfig wiring, Dockerfile sync, and how the affected-package CI picks it up. Invoke whenever the user scaffolds, adds, or registers a new app/service/package.
---

# Bootstrap a new app (or library)

CI in this repo is **convention-driven**: there is no per-app CI config. A new
package is picked up automatically by `.github/workflows/app-ci.yml` **the
moment its `package.json` declares the right scripts**. Get the scripts right
and CI just works; get them wrong and the package is silently skipped.

Two pieces make this work, and you must respect both:

1. **`tis repo affected`** (`cli/src/commands/repo/affected.ts`) discovers
   every workspace package, builds the internal dependency graph, and lists
   the packages a change touches (changed + everything that depends on them).
   CI runs it with `--json` to build its matrix; locally, `--run` runs the
   same checks.
2. **The script contract** — the canonical script names below.

> Which scripts CI runs lives in exactly one place in code: the
> `PREP_SCRIPTS` and `CHECK_SCRIPTS` arrays at the top of
> `cli/src/commands/repo/affected.ts`. If you ever add a new _kind_ of check,
> add it there too.

---

## The script contract

Every code package defines these five, with exactly these commands (the
`--ignore-path` prefix is the relative path to the repo root):

```jsonc
"scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run --passWithNoTests",
    "format": "prettier --write . --ignore-path ../../.gitignore --ignore-path ../../.prettierignore && eslint --fix .",
    "check": "prettier --check . --ignore-path ../../.gitignore --ignore-path ../../.prettierignore"
}
```

- `lint` and `check` never mutate; `format` is the only fixing script.
- `test` must tolerate an empty suite (`--passWithNoTests`). Vitest everywhere,
  servers included.
- Prettier only reads ignore files from its cwd, hence the explicit
  `--ignore-path`s pointing at the root files.

On top of the contract, CI also runs these when present, in this order:

| Order | Script            | When to include                               |
| ----- | ----------------- | --------------------------------------------- |
| 1     | `prisma:generate` | Package owns a Prisma schema (prep step)      |
| 2     | `typecheck`       | contract                                      |
| 3     | `lint`            | contract                                      |
| 4     | `build`           | App that produces an artifact (not pure libs) |
| 5     | `test`            | contract                                      |
| 6     | `prisma:validate` | Package owns a Prisma schema                  |

Config-only packages (`lib/tsconfig`, `lib/eslint-config`) have no scripts.

---

## ESLint and TypeScript wiring

- `eslint.config.js` is one line, picking a preset from `@monsieurtis/eslint-config`:
    - `base` — framework-agnostic TS (libs, interfaces, cli)
    - `react` — React apps and libs (TanStack config)
    - `nest` — NestJS servers and Nest libs

    ```js
    export { default } from "@monsieurtis/eslint-config/react";
    ```

- devDeps: `@monsieurtis/eslint-config: workspace:*`, `@monsieurtis/tsconfig: workspace:*`,
  `eslint: catalog:tooling`, `prettier: catalog:tooling`, `vitest: catalog:build`.
- `tsconfig.json` extends `@monsieurtis/tsconfig/{base,client,server}.json`.
  `base.json` sets `types: []`: opt in to `node`, `bun` or `vite/client`
  explicitly.
- **Never** add `paths` to other workspace packages or `baseUrl`: workspace
  packages resolve through their `exports`. Only app-local aliases belong in
  `paths` (`@/*` in servers); clients use package.json `imports` (`#/*`).

## Templates by app type

### Client-only app (Vite — like `crocus`, `harley`)

Contract + `dev`, `build`, `preview`. Preset `react`, tsconfig `client.json`
with `types: ["vite/client"]`.

### Server-only app (NestJS — like `linlin-server`)

Contract + build/start scripts, run on Bun (workspace libs ship TypeScript
that Bun transpiles at runtime):

```jsonc
"build": "nest build",
"start": "nest start --exec bun",
"start:dev": "nest start --watch --exec bun",
"start:prod": "bun dist/main.js",
// Only if the app owns a Prisma schema:
"prisma:generate": "prisma generate --schema <path/to/schema.prisma>",
"prisma:validate": "prisma validate --schema <path/to/schema.prisma>"
```

Preset `nest`, tsconfig `server.json`, a `vitest.config.ts` (copy linlin-server's).
Env comes from the process (Bun loads `.env` itself): no `dotenv`.

### Server + client app (like `linlin`)

A client package, a server package and an `interfaces` package under one
`apps/<name>/` folder. `interfaces` is a real package (`exports` per folder,
e.g. `"./domain/*": "./domain/*.ts"`) that both sides depend on with
`workspace:*` and import by name
(`@monsieurtis/<name>-interfaces/domain/foo.entity`).

### Library (under `lib/`)

Contract only, consumed from source (`exports` → `.ts`), so no `build`.

---

## Registering the package

1. **Add it to the root `package.json` `workspaces.packages`**.
2. **Declare internal deps with `workspace:*`** — the dependency graph (CI
   fan-out, Dockerfile COPY lists) is built from them.
3. **Use `catalog:` versions** for any dependency another package also uses:
   `tis repo catalog-check` fails CI otherwise.
4. **Dockerfile?** Put the generated-block markers where workspace sources are
   copied and let `tis repo sync` fill them (see `apps/crocus/Dockerfile`):

    ```dockerfile
    ARG BUN_VERSION=0.0.0
    FROM oven/bun:${BUN_VERSION}-alpine AS deps
    …
    # >>> tis repo sync: workspace sources (generated, do not edit)
    # <<< tis repo sync
    ```

5. **Run `bun install`** (CI uses `--frozen-lockfile`) and `tis repo sync`.

---

## Verify before opening the PR

```bash
tis repo affected          # your package listed with the expected scripts
tis repo affected --run    # run exactly what CI will run
tis repo sync --check
tis repo catalog-check
```

If your package is missing from the list, it's almost always one of: the path
isn't in `workspaces.packages`, `package.json` has no `name`, or it has no
check script.
