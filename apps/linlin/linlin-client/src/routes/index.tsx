import {
    setupListQueryOptions,
    tagsQueryOptions,
    viewsQueryOptions,
} from "@/api/setups";
import { SetupsPagePending } from "@/blocks/page-state";
import { SetupsPage } from "@/pages/setups-page";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const setupSearchSchema = z.object({
    q: z.string().optional().catch(undefined),
    tags: z.array(z.string()).optional().catch(undefined),
    match: z.enum(["any", "all"]).optional().catch(undefined),
    scope: z.enum(["all", "root", "nested"]).optional().catch(undefined),
});

export const Route = createFileRoute("/")({
    validateSearch: setupSearchSchema,
    loaderDeps: ({ search }) => search,
    loader: ({ context: { queryClient }, deps }) =>
        Promise.all([
            queryClient.ensureQueryData(setupListQueryOptions(deps)),
            queryClient.ensureQueryData(tagsQueryOptions()),
            queryClient.ensureQueryData(viewsQueryOptions()),
        ]),
    pendingComponent: SetupsPagePending,
    component: SetupsPage,
});
