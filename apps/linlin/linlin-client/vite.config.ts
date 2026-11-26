import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    resolve: { tsconfigPaths: true },
    plugins: [
        devtools(),
        tanstackRouter({ target: "react", autoCodeSplitting: true }),
        viteReact(),
        tailwindcss(),
    ],
    server: {
        port: 3000,
        proxy: {
            "/api": process.env.LINLIN_API_URL ?? "http://localhost:8000",
        },
    },
});
