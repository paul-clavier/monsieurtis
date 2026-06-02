import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

/**
 * Liveness + readiness probe target. Returns 200 as long as the process can
 * serve a request. We don't fan out to Kratos/Hydra/Keto here — those have
 * their own probes, and a green Crocus is independent of them.
 */
const healthFn = createServerFn({ method: "GET" }).handler(async () => ({ ok: true }));

export const Route = createFileRoute("/healthz")({
    loader: () => healthFn(),
    component: () => <pre>ok</pre>,
});
