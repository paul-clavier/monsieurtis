import dotenv from "dotenv";
dotenv.config();

export const ENVS = [
    "development",
    "local",
    "staging",
    "production",
    "test",
] as const;
export type Env = (typeof ENVS)[number];

/**  APP CONFIGURATION */
export const ENV = process.env.ENV! as Env;
export const PORT = process.env.PORT ?? 8000;

export const CLIENT_HOST = process.env.CLIENT_HOST;
export const CLIENT_PORT = process.env.CLIENT_PORT;
export const CLIENT_URL = ["development", "local"].includes(ENV)
    ? `http://${CLIENT_HOST}:${CLIENT_PORT}`
    : `https://${CLIENT_HOST}`;
export const SWAGGER_URL = ["development", "local"].includes(ENV)
    ? `http://${CLIENT_HOST}:${PORT}/api`
    : `https://api.${CLIENT_HOST}`;

// Add localhost:3000 for non-production environments (local dev against remote backends)
export const CORS_ORIGINS: string[] = [CLIENT_URL, SWAGGER_URL];
if (ENV !== "production") {
    CORS_ORIGINS.push("http://localhost:3000");
}

export const SWAGGER_USER = process.env.SWAGGER_USER!;
export const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD!;

// Database
export const DATABASE_URL = process.env.DATABASE_URL!;
