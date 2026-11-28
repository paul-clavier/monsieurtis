import { paint, type Color } from "./log";

interface RunOptions {
    cwd: string;
    env?: Record<string, string>;
}

/** Runs a command to completion, inheriting stdio. Resolves with its exit code. */
export const run = async (
    cmd: string[],
    options: RunOptions,
): Promise<number> => {
    const proc = Bun.spawn(cmd, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: ["inherit", "inherit", "inherit"],
    });
    return proc.exited;
};

const pipePrefixed = async (
    stream: ReadableStream<Uint8Array>,
    prefix: string,
    out: NodeJS.WriteStream,
): Promise<void> => {
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of stream) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) out.write(`${prefix} ${line}\n`);
    }
    if (buffer) out.write(`${prefix} ${buffer}\n`);
};

export interface LongRunning {
    label: string;
    color: Color;
    cmd: string[];
    cwd: string;
}

/**
 * Spawns long-running processes side by side with prefixed output.
 * Resolves when the first one exits (or on Ctrl+C), after stopping the others.
 */
export const runAll = async (procs: LongRunning[]): Promise<number> => {
    const width = Math.max(...procs.map((p) => p.label.length));
    const children = procs.map((p) => {
        const child = Bun.spawn(p.cmd, {
            cwd: p.cwd,
            env: { ...process.env, FORCE_COLOR: "1" },
            stdio: ["ignore", "pipe", "pipe"],
        });
        const prefix = paint(p.color, p.label.padEnd(width) + " |");
        void pipePrefixed(child.stdout, prefix, process.stdout);
        void pipePrefixed(child.stderr, prefix, process.stderr);
        return child;
    });

    const stopAll = () => {
        for (const child of children) if (!child.killed) child.kill("SIGTERM");
    };

    const interrupted = new Promise<number>((resolve) => {
        const onSignal = () => resolve(130);
        process.once("SIGINT", onSignal);
        process.once("SIGTERM", onSignal);
    });

    const code = await Promise.race([
        ...children.map((child) => child.exited),
        interrupted,
    ]);
    stopAll();
    await Promise.all(children.map((child) => child.exited));
    return code;
};
