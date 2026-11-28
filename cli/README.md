# tis

Monsieur Tis developer CLI.

## Install

Nothing to install: the repo's `mise.toml` puts `cli/bin` on your `PATH`, so
`tis` is available anywhere inside the repo once mise is activated in your
shell (`eval "$(mise activate zsh)"`) and the config is trusted (`mise trust`).

Without mise, run `bun cli/src/main.ts <group> <command>` from the repo root.

`tis` is the single entry point for app and repo tasks; the Makefile only
keeps infra and secrets targets.

## Commands

### Repo

| Command                            | What it does                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `tis repo affected [--base <ref>]` | Lists the packages affected by your changes (committed and uncommitted, vs `origin/main`) and the checks CI would run for them. |
| `tis repo affected --run`          | Runs those checks locally, exactly as CI does.                                                                                  |
| `tis repo affected --json`         | Prints the GitHub Actions matrix (committed changes only). Used by `app-ci.yml`.                                                |
| `tis repo sync [--check]`          | Regenerates Dockerfile COPY lists from the workspace graph, and bun version pins from `packageManager` (package.json).          |
| `tis repo catalog-check`           | Fails if a dependency used by 2+ packages is pinned outside a root catalog.                                                     |

### Linlin

| Command                                  | What it does                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `tis linlin up`                          | Starts db + server (`apps/linlin/linlin-server/compose.yml`) and the client Vite dev server. |
| `tis linlin migration-new --name <name>` | Creates a Prisma migration from schema changes, without applying it.                         |
| `tis linlin migration-apply`             | Applies pending migrations (`prisma migrate deploy`).                                        |
| `tis linlin entity-new <Entity>`         | Scaffolds a CRUD entity (interface, repository, use cases, modules, controller).             |

`migration-new` works offline. Each migration folder keeps a `schema.prisma`
snapshot of the schema it produced, and the next migration is diffed against
that snapshot. Don't delete or hand-edit those snapshots. The first migration
is diffed from an empty schema.

`migration-apply` uses `DATABASE_URL` from `apps/linlin/.env` (copy
`apps/linlin/.env.example`).

`Ctrl+C` stops the client and the compose services (the Postgres volume is kept).

## Adding a command

1. Create `src/commands/<app>/<command>.ts` exporting a `Command`.
2. Add it to the app's `CommandGroup` in `src/commands/<app>/index.ts`
   (create the group and register it in `GROUPS` in `src/main.ts` for a new app).
