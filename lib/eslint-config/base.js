// @ts-check
// Preset for framework-agnostic TypeScript packages (lib/core, lib/packages/*,
// interfaces, cli). Type-aware: each linted file must belong to a tsconfig.
import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import { ignores } from "./ignores.js";

export default tseslint.config(
    ignores,
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: { projectService: true },
        },
        // `any` is sometimes the honest type at library seams (generic Prisma
        // delegates, untyped framework requests): surface it, don't block on it.
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
        },
    },
    // Formatting belongs to prettier (`format` / `check` scripts): turn off
    // every stylistic rule that would fight it.
    prettier,
);
