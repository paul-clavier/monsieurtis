import {
    createRootRoute,
    HeadContent,
    Outlet,
    Scripts,
} from "@tanstack/react-router";

import { LighthouseMark, LighthouseMotif } from "../components/brand";
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
            <LighthouseMotif className="pointer-events-none absolute -right-8 -bottom-8 h-110 w-69 opacity-[0.1] select-none" />
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
