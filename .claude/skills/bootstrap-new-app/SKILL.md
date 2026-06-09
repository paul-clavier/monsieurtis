---
name: bootstrap-new-app
description: Checklist for adding a new app or library to the monorepo so it plugs into CI automatically. Use when creating a new workspace package under apps/ or lib/ — covers the required package.json scripts (the "CI script contract"), eslint/tsconfig wiring, and how the affected-package CI picks it up. Invoke whenever the user scaffolds, adds, or registers a new app/service/package.
---

# Bootstrap a new app (or library)

CI in this repo is **convention-driven**: there is no per-app CI config. A new
package is picked up automatically by `.github/workflows/app-ci.yml` **the
moment its `package.json` declares the right scripts**. Get the scripts right
and CI just works; get them wrong and the package is silently skipped.

Two pieces make this work, and you must respect both:

1. **`scripts/affected.ts`** discovers every workspace package, builds the
   internal dependency graph, and emits a CI matrix of the packages a change
   touches (changed + everything that depends on them).
2. **The CI script contract** — the canonical script names below. A package
   opts into a check purely by defining a script with the matching name.

> The contract lives in exactly one place in code: the `PREP_SCRIPTS` and
> `CHECK_SCRIPTS` arrays at the top of `scripts/affected.ts`. If you ever add a
> new _kind_ of check, add it there too — that is the source of truth.

---

## The CI script contract

CI runs, per affected package, `bun run --filter <pkg> <script>` for each of
these it finds, **in this order**:

| Order | Script            | When to include                               | Must be…                            |
| ----- | ----------------- | --------------------------------------------- | ----------------------------------- |
| 1     | `prisma:generate` | Package owns a Prisma schema                  | a prep step (generates client)      |
| 2     | `typecheck`       | **Always** (any package with TS)              | `tsc --noEmit`, non-mutating        |
| 3     | `lint`            | Package has an eslint config                  | **non-mutating** — never `--fix`    |
| 4     | `build`           | App that produces an artifact (not pure libs) | —                                   |
| 5     | `test`            | Always for apps; libs if they have tests      | must pass with **no** tests present |
| 6     | `prisma:validate` | Package owns a Prisma schema                  | validates schema (server check)     |

Rules that keep the contract from diverging:

- **`lint` must not mutate.** Use `eslint` / `eslint "<globs>"`, never
  `--fix`. CI fails on lint errors; it never rewrites code.
- **`test` must tolerate an empty suite.** Vitest/Jest exit non-zero with no
  tests, which would make a brand-new app red. Always pass the no-tests flag:
    - Vitest: `vitest run --passWithNoTests`
    - Jest: `jest --passWithNoTests`
- **A package with no `CHECK_SCRIPTS` never appears in CI.** If you create a
  package and forget `typecheck`, it is invisible to CI. At minimum every
  TS package gets `typecheck`.
- **Match the existing tier exactly.** Copy scripts from the closest existing
  app (see templates below) rather than inventing variants. Divergence here is
  the thing this skill exists to prevent.

---

## Copy-paste templates by app type

Pick the row of `apps/` your new app matches (see `.claude/rules/archi-repo.md`).

### Client-only app (Vite — like `crocus`, `harley`)

```jsonc
"scripts": {
    "dev": "vite dev --port <PORT>",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run --passWithNoTests",
    "typecheck": "tsc --noEmit",
    "lint": "eslint",
    "format": "prettier --write . && eslint --fix",
    "check": "prettier --check ."
}
```

Also add, mirroring `crocus`:

- `eslint.config.js` (copy `apps/crocus/eslint.config.js` verbatim — it's the tanstack config).
- `tsconfig.json` extending `@monsieurtis/tsconfig/client.json`.
- devDeps `@tanstack/eslint-config: catalog:tanstack` and `eslint: catalog:tooling`.

### Server-only app (NestJS — like `linlin-server`)

```jsonc
"scripts": {
    "build": "nest build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "test": "jest --passWithNoTests",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    // Only if the app owns a Prisma schema:
    "prisma:generate": "prisma generate --schema <path/to/schema.prisma>",
    "prisma:validate": "prisma validate --schema <path/to/schema.prisma>"
}
```

- `eslint.config.mjs` — copy `apps/linlin/linlin-server/eslint.config.mjs`.
- `tsconfig.json` extending `@monsieurtis/tsconfig/server.json`.
- **Prisma note:** the generated client is git-ignored, so CI runs
  `prisma:generate` _before_ `typecheck`/`build`/`test`. That ordering is
  already handled by `affected.ts` (it lists prep scripts first) — you only
  need to declare the script. Once you add a `migrations/` dir, upgrade
  `prisma:validate` to drift detection:
  `prisma migrate diff --from-migrations ./migrations --to-schema-datamodel <schema> --exit-code`.

### Server + client app (like `linlin`)

It's two workspace packages — a client and a server — under one `apps/<name>/`
folder, plus an `interfaces/` package. Apply the **client-only** template to
the client package and the **server-only** template to the server package.
`interfaces/` is type-only: it gets just `"typecheck": "tsc --noEmit"`.

### Library (under `lib/` — like `@monsieurtis/core`, `@monsieurtis/ui`)

Libraries are checked in isolation (and as dependents when something they
import changes). They are consumed from source, so usually **no `build`**:

```jsonc
"scripts": {
    "typecheck": "tsc --noEmit"
}
```

Add `lint` + an eslint config only if you want the lib linted. A lib with
genuinely zero checks (no `typecheck`) is invisible to CI — don't leave real
code in that state.

---

## Registering the package

1. **Add it to the root `package.json` `workspaces.packages`** (exact path,
   e.g. `"apps/foo"`, or rely on an existing glob like `"lib/packages/*"`).
   `affected.ts` reads this list — a package not listed here is invisible.
2. **Declare internal deps with `workspace:*`** (e.g.
   `"@monsieurtis/ui": "workspace:*"`). This is what the dependency graph is
   built from, so the new app's CI fires when an imported lib changes — and
   the lib's change correctly fans out to this app. No CI file edits needed.
3. **Use `catalog:` versions** for shared deps (react, tanstack, nest, prisma,
   tooling…) — see the catalogs in the root `package.json`.
4. **Run `bun install`** to update `bun.lock` (CI uses `--frozen-lockfile`).

---

## Verify before opening the PR

```bash
# 1. The package shows up with the scripts you expect (run from repo root,
#    simulating that only your new app changed):
bun scripts/affected.ts main
#    → confirm your package appears with the right "scripts" list.

# 2. Each declared script actually runs and is non-mutating:
bun run --filter '<your-package-name>' typecheck
bun run --filter '<your-package-name>' lint
bun run --filter '<your-package-name>' test
# (+ build / prisma:* where applicable)
```

If your package is missing from the matrix output, it's almost always one of:
the path isn't in `workspaces.packages`, `package.json` has no `name`, or it
has no `CHECK_SCRIPTS` (e.g. no `typecheck`).

---

## Formatting

Don't add a repo-wide format step — the `format` job in `app-ci.yml` already
checks `prettier` on changed files. Just make sure your new files conform to
the root `.prettierrc.json` (4-space, double quotes): run
`bunx prettier --write <your new files>` before committing.
