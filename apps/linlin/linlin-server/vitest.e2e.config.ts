import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

export default mergeConfig(
    base,
    defineConfig({
        test: { include: ["test/**/*.e2e-spec.ts"] },
    }),
);
