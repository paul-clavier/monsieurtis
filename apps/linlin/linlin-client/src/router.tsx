import { createRouter } from "@tanstack/react-router";
import { queryClient } from "./api/query-client";
import { PageError } from "./blocks/page-state";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: PageError,
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}
