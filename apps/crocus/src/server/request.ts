/**
 * Tiny shim around TanStack Start's server-request helpers. Centralised here
 * so route files don't sprinkle import paths and so we can adapt to API drift
 * (the start helpers moved between minor versions) in one place.
 *
 * Server-only — do not import from a component body.
 */
import { getRequestHeader } from "@tanstack/react-start/server";

export const getCookieHeader = (): string => getRequestHeader("cookie") ?? "";
