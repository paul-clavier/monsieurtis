// Build output and generated code that no preset should lint. ESLint only
// ignores node_modules by default.
export const ignores = {
    ignores: [
        "**/dist/**",
        "**/.output/**",
        "**/.nitro/**",
        "**/.tanstack/**",
        "**/coverage/**",
        "**/generated/**",
        "**/routeTree.gen.ts",
        // Config files sit outside each package's tsconfig, so type-aware
        // rules can't parse them.
        "*.config.{js,mjs,ts}",
    ],
};
