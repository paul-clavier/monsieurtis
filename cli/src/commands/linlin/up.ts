import type { Command } from "../../command";
import { info } from "../../utils/log";
import { repoPath } from "../../utils/paths";
import { run, runAll } from "../../utils/process";

const SERVER_DIR = repoPath("apps/linlin/linlin-server");
const CLIENT_DIR = repoPath("apps/linlin/linlin-client");
const COMPOSE = ["docker", "compose", "-f", `${SERVER_DIR}/compose.yml`];

/**
 * Starts the whole linlin stack for local development:
 *   - db + server (hot reload) through the server's docker compose file,
 *   - the client Vite dev server on the host.
 * Ctrl+C stops the client and the compose services (data volume is kept).
 */
export const up: Command = {
    name: "up",
    description:
        "Start linlin (db + server via docker compose, client dev server)",
    run: async () => {
        // Only stream logs from this run, not the reused container's history.
        const since = new Date().toISOString();
        info("starting db + server (docker compose)…");
        const composeCode = await run(
            [...COMPOSE, "up", "-d", "--build", "--wait"],
            {
                cwd: SERVER_DIR,
            },
        );
        if (composeCode !== 0) return composeCode;

        info("server → http://localhost:8000");
        info("client → http://localhost:3000");
        info("Ctrl+C to stop");

        const code = await runAll([
            {
                label: "server",
                color: "magenta",
                cmd: [
                    ...COMPOSE,
                    "logs",
                    "-f",
                    "--no-log-prefix",
                    "--since",
                    since,
                    "server",
                ],
                cwd: SERVER_DIR,
            },
            {
                label: "client",
                color: "yellow",
                cmd: ["bun", "run", "dev"],
                cwd: CLIENT_DIR,
            },
        ]);

        info("stopping db + server…");
        await run([...COMPOSE, "stop"], { cwd: SERVER_DIR });
        return code;
    },
};
