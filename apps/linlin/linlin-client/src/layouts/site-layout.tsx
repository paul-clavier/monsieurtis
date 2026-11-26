import { Button } from "@monsieurtis/ui/components/button";
import { Toaster } from "@monsieurtis/ui/components/sonner";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { PlusIcon } from "lucide-react";

export const SiteLayout = () => (
    <div className="site flex min-h-screen flex-col">
        <header className="site-header">
            <div className="site-header-bar">
                <Link to="/" className="brand app-title">
                    Linlin
                </Link>
                <nav className="site-nav">
                    <Link
                        to="/"
                        className="nav-link"
                        activeOptions={{ exact: true, includeSearch: false }}
                        activeProps={{ "data-active": "" }}
                    >
                        Index
                    </Link>
                    <Button size="sm" asChild>
                        <Link to="/setups/new">
                            <PlusIcon />
                            New setup
                        </Link>
                    </Button>
                </nav>
            </div>
        </header>
        <main className="site-main">
            <Outlet />
        </main>
        <footer className="site-footer">Linlin · a collection of setups</footer>
        <Toaster position="bottom-center" />
        {import.meta.env.DEV && (
            <TanStackDevtools
                config={{ position: "bottom-right" }}
                plugins={[
                    {
                        name: "TanStack Router",
                        render: <TanStackRouterDevtoolsPanel />,
                    },
                    {
                        name: "TanStack Query",
                        render: <ReactQueryDevtoolsPanel />,
                    },
                ]}
            />
        )}
    </div>
);
