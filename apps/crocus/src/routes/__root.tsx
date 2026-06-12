import {
    createRootRoute,
    HeadContent,
    Outlet,
    Scripts,
} from "@tanstack/react-router";

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
        links: [{ rel: "stylesheet", href: appCss }],
    }),
    shellComponent: RootDocument,
    component: RootShell,
});

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
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
        <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <Outlet />
            </main>
            <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
                MonsieurTis SSO
            </footer>
        </div>
    );
}
