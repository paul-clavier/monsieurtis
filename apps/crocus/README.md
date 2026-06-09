# Crocus — the MonsieurTis SSO console

TanStack Start app that owns every user-facing surface of the Ory stack:

| Route           | Role                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------- |
| `/`             | Post-login launcher — lists the apps the user can reach                                      |
| `/login`        | Hydra → Kratos bridge: handles `?login_challenge=…` from Hydra                               |
| `/registration` | Bounces to the Kratos browser registration flow                                              |
| `/recovery`     | Bounces to the Kratos password reset flow                                                    |
| `/consent`      | The **Keto gate**: `?consent_challenge=…` from Hydra; denies via redirect to `/denied?app=…` |
| `/denied`       | Friendly "no access to {app}" page with the user's app launcher                              |
| `/healthz`      | Liveness probe                                                                               |

## Architecture

- Every admin call (Kratos admin, Hydra admin, Keto read) happens inside a
  `createServerFn` handler — admin URLs live only in the Node runtime.
- All Ory helpers come from `@monsieurtis/ory` (workspace package).
- All UI components come from `@monsieurtis/ui` (workspace package).
- Server-only modules live under `src/server/` and import `process.env`.

## Running locally

Crocus expects the in-cluster Ory services. Two options:

1. **Port-forward** from a live cluster:
    ```bash
    kubectl -n identity port-forward svc/kratos-public 4433:80 &
    kubectl -n identity port-forward svc/kratos-admin  4434:80 &
    kubectl -n identity port-forward svc/hydra-admin   4445:4445 &
    kubectl -n identity port-forward svc/keto-read     4466:80 &
    ```
2. **docker-compose** (TODO) for a fully offline dev loop.

Then:

```bash
KRATOS_PUBLIC_URL=http://localhost:4433 \
KRATOS_ADMIN_URL=http://localhost:4434 \
HYDRA_ADMIN_URL=http://localhost:4445 \
KETO_READ_URL=http://localhost:4466 \
PUBLIC_AUTH_ORIGIN=http://localhost:3001 \
bun run dev
```

## Deploying

CI builds and pushes the image as `ghcr.io/monsieurtis/crocus:<sha>`. The
`infra/identity` Terraform module references the image tag via
`var.crocus_image` and rolls out a new Deployment on apply.
