import {
    createRootRoute,
    HeadContent,
    Outlet,
    Scripts,
} from "@tanstack/react-router";

import { CrocusMotif, LighthouseMark } from "../components/brand";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            { title: "MonsieurTis · Identity" },
        ],
        links: [
            { rel: "stylesheet", href: appCss },
            { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        ],
    }),
    shellComponent: RootDocument,
    component: RootShell,
});

function RootDocument({ children }: { children: React.ReactNode }) {
    // `dark` is hard-coded: Crocus is dark-themed regardless of OS preference.
    return (
        <html lang="en" className="dark">
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <Scripts />
            </body>
        </html>
    );
}

function RootShell() {
    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden bg-background text-foreground antialiased">
            <CrocusMotif className="pointer-events-none absolute -right-12 -bottom-10 h-105 w-87 opacity-[0.13] select-none" />
            <main className="relative flex-1 flex items-center justify-center px-4 py-12">
                <Outlet />
            </main>
            <footer className="relative border-t border-border/40 py-4 text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-1.5">
                    <LighthouseMark className="h-4 w-4" />
                    <span>MonsieurTis SSO</span>
                </div>
            </footer>
        </div>
    );
}
