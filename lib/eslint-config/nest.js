// @ts-check
// Preset for NestJS servers and Nest libraries: base + Node globals and the
// rule relaxations Nest's decorator/DI style needs.
import globals from "globals";
import tseslint from "typescript-eslint";
import base from "./base.js";

export default tseslint.config(...base, {
    languageOptions: {
        globals: { ...globals.node },
    },
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-floating-promises": "warn",
        "@typescript-eslint/no-unsafe-argument": "warn",
    },
});
