# Bun workspaces, the source-first way

A working notebook on how to build a TypeScript monorepo with Bun workspaces — what each piece does, why it's there, and how the parts fit together. Examples mirror a real layout with `apps/`, `lib/core`, `lib/ui`, and `lib/packages/*`, but the ideas transfer to any monorepo.

The goal: get the same lightweight, "edit a lib, see it everywhere instantly" feel that `uv` workspaces give in Python. No `dist/` directories in libs, no `tsc -b --watch` ceremony, no stale builds.

---

## 1. The mental model: three independent layers

Most monorepo confusion comes from conflating three things that TypeScript splits across separate tools:

| Layer | Question it answers | Tool |
|---|---|---|
| **Package graph** | "What depends on what? Where do my `node_modules` come from?" | Bun workspaces |
| **Module resolution** | "When I write `import X from '@scope/foo'`, what file gets loaded?" | Node + `package.json#exports` |
| **Type graph** | "How does TypeScript know the types of imported packages?" | Per-package `tsconfig.json` |

Bun workspaces only solve the first layer. The other two are configured in `package.json` and `tsconfig.json` files. A coherent setup picks one strategy and applies it consistently to all three. The strategy this article commits to is **source-first**: shared libs ship `.ts` files directly, never compiled output.

---

## 2. What "Bun workspaces" actually does

Workspaces are a single entry in the root `package.json`:

```jsonc
// package.json (repo root)
{
  "name": "monorepo-root",
  "private": true,
  "packageManager": "bun@1.3.13",
  "workspaces": [
    "apps/*/*",
    "lib/core",
    "lib/ui",
    "lib/tsconfig",
    "lib/packages/*"
  ]
}
```

Each glob is a path pattern that points at folders containing a `package.json`. Bun then does three things:

1. **Hoists shared dependencies** to the root `node_modules`. Every workspace package shares one copy of `react`, `typescript`, etc. — no duplication, no version drift.
2. **Symlinks workspace packages** into each consumer's `node_modules`. When `apps/linlin/linlin-server` declares `"@monsieurtis/core": "workspace:*"`, Bun creates `apps/linlin/linlin-server/node_modules/@monsieurtis/core` as a symlink to `lib/core/`. Imports resolve to the live source — no copy step.
3. **Runs scripts across packages** via `bun --filter <pattern> <script>`.

The `workspace:*` protocol is the magic word. It tells Bun "this dependency lives in the workspace, link it locally instead of fetching from npm." `*` means "match any version" since workspace packages are typically `0.0.0` and unpublished.

### Why globs vs. explicit paths

`apps/*/*` matches `apps/linlin/linlin-server` and `apps/linlin/linlin-client` but **not** `apps/linlin` itself. This is deliberate: an `apps/<name>` folder is a logical grouping (server + client + shared interfaces), not a package. Listing `apps/*` would make Bun look for a `package.json` at `apps/linlin` and treat it as a workspace package if found, which causes confusion.

Pick a depth and stick to it. For a server-only app you'd add `apps/<name>` directly; for the server+client layout, `apps/*/*` is cleaner.

---

## 3. The repo layout

```
monorepo/
├── apps/
│   ├── linlin/
│   │   ├── linlin-server/      ← workspace package
│   │   ├── linlin-client/      ← workspace package
│   │   └── interfaces/         ← shared types between client/server (NOT a package)
│   └── harley/
│       └── harley-server/
├── lib/
│   ├── tsconfig/               ← workspace package: shared compiler presets
│   ├── core/                   ← workspace package: client+server safe primitives
│   ├── ui/                     ← workspace package: client-only components/hooks
│   └── packages/
│       ├── prisma/             ← workspace package
│       ├── redis/
│       └── kafka/
├── package.json                ← workspaces root
├── tsconfig.json               ← optional solution file (see §9)
└── bun.lock
```

Two distinctions worth being explicit about:

- **`apps/<name>/interfaces/`** is not a workspace package. It's just a folder of `.ts` files that the sibling server and client both import via relative paths or the app's own `paths` alias. It belongs to one app and isn't shared across apps.
- **`lib/core` vs `lib/packages/*`** is a useful naming convention but invisible to Bun:
  - `lib/core` — primitives anything can use (utilities, shared domain types). One package.
  - `lib/packages/*` — one package per external dependency you want to standardize (Prisma setup, Redis client wrapper, Kafka producer). Apps install only the ones they need.
  - `lib/ui` — client-only UI primitives. Same idea as `core` but scoped to React.

---

## 4. The package.json shape every shared lib uses

This is where source-first happens. Each lib exposes its source files via the `exports` field:

```jsonc
// lib/core/package.json
{
  "name": "@monsieurtis/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "devDependencies": { "typescript": "6.0.2" }
}
```

Three things to internalize:

1. **`exports` is the public contract.** No `main`, no `types`, no `module` field — `exports` supersedes them all and is honored by Node, Bun, Vite, ts-node, and every modern bundler.
2. **The path points at `.ts`.** This is the source-first move: consumers receive raw TypeScript and compile it themselves (via their own bundler or ts compiler). No `dist/`, no build step in the lib.
3. **A single `.` entry plus a barrel `src/index.ts`** keeps the public API in one obvious place:

```ts
// lib/core/src/index.ts
export { Result, ok, err } from "./utils/result";
export type { BaseEntity, Mutable, DeepPartial } from "./utils/types";
export { DomainError, ObjectNotFoundError } from "./utils/errors";
```

Consumers always write `import { Result } from "@monsieurtis/core"`. You can split, rename, or reorganize anything under `src/` without touching a single import site. The barrel is the API surface.

### Barrels: the rules

- **Internal files import each other directly**, never via the barrel. `prisma.module.ts` imports `./prisma.service`, not `from "@monsieurtis/prisma"`. Going through your own barrel creates circular imports.
- **Curate the barrel.** Every export there is a commitment. Resist `export *` unless you genuinely want everything public.
- **Keep modules side-effect-free.** Important once you build `lib/ui`: barrels with side effects defeat tree-shaking, dragging unused components into the bundle. Add `"sideEffects": false` in client-side packages once they exist.

### When to break the single-entry rule

Add a second subpath only when a package has a clear bimodal split that *must not* mix — e.g. a `./client` half that uses browser APIs and a `./server` half that uses `fs`. Splitting prevents consumers from accidentally pulling code that can't run in their environment. Don't split for organizational neatness; that's what folders inside `src/` are for.

---

## 5. The dependency-package pattern

`lib/packages/*` is where you encapsulate the boilerplate of an external dependency so apps can adopt it in one line. Prisma is the canonical example:

```
lib/packages/prisma/
├── src/
│   ├── prisma.service.ts       ← thin wrapper over PrismaClient
│   ├── prisma.module.ts        ← Nest module exposing PrismaService
│   └── index.ts                ← barrel
├── prisma/
│   └── schema.prisma           ← schema travels with the package
└── package.json
```

```jsonc
// lib/packages/prisma/package.json
{
  "name": "@monsieurtis/prisma",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@prisma/client": "6.7.0"
  },
  "peerDependencies": {
    "@nestjs/common": "^11"
  },
  "scripts": {
    "db:generate": "prisma generate --schema ./prisma/schema.prisma",
    "db:migrate":  "prisma migrate dev --schema ./prisma/schema.prisma"
  }
}
```

App-side adoption:

```jsonc
// apps/linlin/linlin-server/package.json
{
  "dependencies": {
    "@monsieurtis/prisma": "workspace:*"
  }
}
```

```ts
// apps/linlin/linlin-server/src/app.module.ts
import { PrismaModule } from "@monsieurtis/prisma";

@Module({ imports: [PrismaModule] })
export class AppModule {}
```

That's the whole adoption. No copy-pasted `prisma.service.ts`, no per-app boilerplate.

### Two important details

**`peerDependencies` for framework code.** When the package decorates a framework (Nest's `@Injectable()`, React's hooks), put the framework in `peerDependencies`, not `dependencies`. Otherwise consumers can end up with two copies of `@nestjs/common` in their graph — the one in their own `node_modules` and the one nested under `@monsieurtis/prisma/node_modules` — and Nest's DI silently breaks because tokens from different copies don't match.

**Decide who owns the schema.** If every app uses an identical schema, ship `schema.prisma` in the package. If apps need different schemas, the package stops at `PrismaService` / `PrismaModule` factory and each app holds its own schema. Be honest about which world you're in — a "shared" schema across genuinely different apps is a smell that becomes painful within months.

---

## 6. The tsconfig package: shared compiler presets

You'll have many apps and libs. Without a shared tsconfig, settings drift and you get cryptic type errors that disappear when you copy a config from a working project. The fix: make `lib/tsconfig` a real workspace package.

```
lib/tsconfig/
├── package.json
├── base.json           ← universal compiler options
├── server.json         ← extends base, adds Node + Nest decorator support
└── client.json         ← extends base, adds DOM + JSX
```

```jsonc
// lib/tsconfig/package.json
{
  "name": "@monsieurtis/tsconfig",
  "version": "0.0.0",
  "private": true
}
```

```jsonc
// lib/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

```jsonc
// lib/tsconfig/server.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

```jsonc
// lib/tsconfig/client.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx"
  }
}
```

Each app or lib then needs four lines:

```jsonc
// apps/linlin/linlin-server/tsconfig.json
{
  "extends": "@monsieurtis/tsconfig/server.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

### Why a *package*, not just a folder

Extending via npm name (`"@monsieurtis/tsconfig/server.json"`) is location-independent. Move an app from `apps/linlin/linlin-server` to `apps/linlin/services/linlin-server` and the extends still resolves. Relative paths like `../../../lib/tsconfig/server.json` would break.

### Why several files instead of one

Server and client compiler options are genuinely different — `lib`, `module`, `jsx`, decorators all diverge. Combining them into one file forces every consumer to override settings, which defeats the point of a shared preset. Three files (base + server + client) is the minimum justified split. Add a fourth (`test.json` with `types: ["jest"]` etc.) only when you need it.

---

## 7. Per-package tsconfig: just for typechecking

Every workspace package gets its own `tsconfig.json`. For libs, it's just for typechecking the lib in isolation — never for emitting output:

```jsonc
// lib/core/tsconfig.json
{
  "extends": "@monsieurtis/tsconfig/base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"]
}
```

`noEmit: true` is the source-first enforcement. The lib never produces compiled output. Running `tsc --noEmit` (or `bun --filter @monsieurtis/core typecheck`) catches lib-internal type errors during dev and CI without ever touching `dist/`.

### Don't use `paths` for cross-package imports

A common mistake: putting `"paths": { "@monsieurtis/core/*": ["../../lib/core/src/*"] }` in an app's tsconfig. **Never do this.** `paths` is a TypeScript-only invention — Node, Bun, and bundlers don't honor it. You'll get the worst possible failure mode: types pass, runtime crashes with "Cannot find module".

The correct mechanism for cross-package imports is `exports` in the shared lib's `package.json` (§4). It works for both TypeScript *and* runtime/bundlers because it's the standard Node mechanism.

Reserve `paths` for **intra-package** aliases only, like `@/*` mapping to `src/*` inside one app.

---

## 8. Per-app tsconfig and build

Apps build themselves; they don't depend on libs being pre-built.

```jsonc
// apps/linlin/linlin-server/tsconfig.json
{
  "extends": "@monsieurtis/tsconfig/server.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

When `nest build` (or `tsc`, or `bun build`) runs:

1. The compiler starts at `src/main.ts`.
2. It encounters `import { PrismaModule } from "@monsieurtis/prisma"`.
3. Module resolution follows the symlink in `node_modules/@monsieurtis/prisma` → `lib/packages/prisma/`.
4. It reads that package's `package.json#exports`, sees `.` → `./src/index.ts`.
5. It compiles those `.ts` files alongside the app's own source.
6. Output ends up in `apps/linlin/linlin-server/dist/`.

No separate build step for libs. No `references`. No `composite`. The app's compiler does it all.

This is why source-first feels like uv workspaces: there's one compilation unit per app, and that compilation includes everything the app reaches transitively, in source form.

---

## 9. The root tsconfig: optional, but useful

In strict source-first with per-app builds, **a root `tsconfig.json` is not required**. Each app's tsconfig is self-contained. You never run `tsc` from the repo root.

Three reasons to keep one anyway, ranked:

1. **CI repo-wide typecheck.** "I only build apps separately" is true for builds, but you almost certainly want CI to catch when a `lib/core` change breaks `apps/foo` *without* having to build every app individually. A solution-style root tsconfig with `references` lets `tsc -b --noEmit` from the root typecheck everything in dependency order with `.tsbuildinfo` caching.
2. **Editor experience for stray files.** Configs, scripts, root-level `.ts` files that don't belong to any package fall back to the nearest tsconfig walking up the tree. The root tsconfig is the catch-all.
3. **Convention.** Some tools assume a root `tsconfig.json` exists.

If you keep one, it should be a solution file — emits nothing on its own, just lists references:

```jsonc
// tsconfig.json (repo root)
{
  "files": [],
  "references": [
    { "path": "./lib/core" },
    { "path": "./lib/ui" },
    { "path": "./lib/packages/prisma" },
    { "path": "./apps/linlin/linlin-server" },
    { "path": "./apps/linlin/linlin-client" }
  ]
}
```

Each referenced project needs `"composite": true` in its own tsconfig — that's the only place `composite` becomes load-bearing in source-first. It enables `.tsbuildinfo` caching and tells `tsc -b` how to order work.

If you skip the root tsconfig entirely, you're trading repo-wide typecheck in CI (a real safety net) for a small simplicity win. Recommendation: keep it.

---

## 10. The 5-minute new-app checklist

With everything above in place, adding a new app is mechanical:

1. `mkdir -p apps/foo/foo-server/src`
2. Create `apps/foo/foo-server/package.json`:
   ```jsonc
   {
     "name": "foo-server",
     "version": "0.0.1",
     "private": true,
     "type": "module",
     "scripts": {
       "start:dev": "nest start --watch",
       "build": "nest build"
     },
     "dependencies": {
       "@monsieurtis/core": "workspace:*",
       "@monsieurtis/prisma": "workspace:*",
       "@nestjs/common": "^11",
       "@nestjs/core": "^11"
     }
   }
   ```
3. Create `apps/foo/foo-server/tsconfig.json` extending `@monsieurtis/tsconfig/server.json`.
4. From the repo root: `bun install`.
5. Write code, importing from `@monsieurtis/*`. No build step on the lib side. Ever.

That's the uv-workspaces feel.

---

## 11. Common pitfalls

### Mixing source-first and build-first
The biggest source of friction. If `@monsieurtis/core` exports `.ts` but `@monsieurtis/prisma` exports `dist/index.js`, you have to remember which packages need a build step, run `bun build` in the right ones before edits propagate, and debug stale-dist issues. Pick one strategy and apply it everywhere.

### TypeScript version drift
A `typescript` dependency at the root *and* in individual apps with different versions causes subtle bugs: types from one TS version don't always match the other, language servers get confused, `skipLibCheck` masks failures inconsistently. Hoist a single TypeScript version to the root and remove it from app `devDependencies`.

### `paths` aliases for cross-package imports
Covered in §7. Use `exports`, not `paths`, for anything that crosses a package boundary.

### Circular imports through barrels
`a.ts` imports from `"./index"` (the barrel), barrel re-exports `b.ts`, `b.ts` imports from `"./index"` → cycle. Keep internal imports on relative paths (`./a`, `./b`); reserve the barrel for *external* consumers.

### Forgetting `peerDependencies` for framework packages
Pre-bundling `@nestjs/common` or `react` as a hard `dependency` of a shared package means consumers may end up with duplicate copies, breaking DI and React contexts. Use `peerDependencies` for any framework the package decorates.

### `apps/*` glob picking up the wrong level
If your apps have a server+client structure, `apps/*` matches `apps/linlin` (the grouping folder). Use `apps/*/*` to target only the actual packages.

---

## 12. Recap

The source-first Bun-workspaces recipe in five lines:

1. Bun workspaces hoist deps and symlink `workspace:*` packages.
2. Each shared lib has `exports: { ".": "./src/index.ts" }` and a barrel.
3. A `@scope/tsconfig` package holds shared compiler presets; everything extends from it.
4. Apps build themselves; libs never produce `dist/`.
5. Optional root tsconfig with references for CI-wide typecheck.

That's the whole architecture. Everything else is just discipline.
