import { Button } from "@monsieurtis/ui/components/button";
import { Toaster } from "@monsieurtis/ui/components/sonner";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { BookOpenIcon, PlusIcon } from "lucide-react";

export const CookbookLayout = () => (
    <div className="cookbook-page flex min-h-screen flex-col">
        <header className="mx-auto w-full max-w-6xl px-4 pt-10 pb-6 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
                <Link to="/" className="group flex items-center gap-4">
                    <span className="cookbook-seal">
                        <BookOpenIcon className="size-6" />
                    </span>
                    <span className="flex flex-col">
                        <span className="cookbook-title">Linlin</span>
                        <span className="cookbook-hand -mt-1 text-xl text-muted-foreground">
                            a little book of setups
                        </span>
                    </span>
                </Link>
                <nav className="flex items-center gap-2">
                    <Button variant="ghost" asChild>
                        <Link
                            to="/"
                            activeOptions={{
                                exact: true,
                                includeSearch: false,
                            }}
                            activeProps={{ "data-active": "" }}
                        >
                            Index
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link to="/setups/new">
                            <PlusIcon />
                            New setup
                        </Link>
                    </Button>
                </nav>
            </div>
            <div className="cookbook-rule mt-6" />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-8">
            <Outlet />
        </main>
        <footer className="cookbook-hand pb-8 text-center text-lg text-muted-foreground">
            ~ bon appétit ~
        </footer>
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
