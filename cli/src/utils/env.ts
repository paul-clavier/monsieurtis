import { existsSync, readFileSync } from "node:fs";

/** Parses a dotenv file (KEY=value, optional quotes, # comments). */
export const readEnvFile = (path: string): Record<string, string> => {
    const env: Record<string, string> = {};
    for (const raw of readFileSync(path, "utf8").split("\n")) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const match = line.match(
            /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
        );
        const key = match?.[1];
        const value = match?.[2] ?? "";
        if (!key) continue;
        const quoted = value.match(/^(['"])(.*)\1$/);
        env[key] = quoted ? (quoted[2] ?? "") : value.replace(/\s+#.*$/, "");
    }
    return env;
};

/** Reads `key` from a dotenv file, or returns an error message. */
export const requireEnvVar = (
    path: string,
    key: string,
): { value: string } | { error: string } => {
    if (!existsSync(path)) return { error: `${path} not found` };
    const value = readEnvFile(path)[key];
    if (!value) return { error: `${key} is not set in ${path}` };
    return { value };
};
