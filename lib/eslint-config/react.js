// @ts-check
// Preset for React apps and libs (TanStack Start apps, lib/ui, ory-react).
import { tanstackConfig } from "@tanstack/eslint-config";
import prettier from "eslint-config-prettier";
import globals from "globals";
import { ignores } from "./ignores.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
    ignores,
    ...tanstackConfig,
    {
        languageOptions: {
            globals: { ...globals.browser },
        },
        rules: {
            "import/no-cycle": "off",
            "import/order": "off",
            "sort-imports": "off",
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/require-await": "off",
            "pnpm/json-enforce-catalog": "off",
        },
    },
    prettier,
];
