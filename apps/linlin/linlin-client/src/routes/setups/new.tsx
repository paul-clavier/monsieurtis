import { setupOptionsQueryOptions, tagsQueryOptions } from "@/api/setups";
import { NewSetupPage } from "@/pages/new-setup-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/setups/new")({
    loader: ({ context: { queryClient } }) =>
        Promise.all([
            queryClient.ensureQueryData(setupOptionsQueryOptions()),
            queryClient.ensureQueryData(tagsQueryOptions()),
        ]),
    component: NewSetupPage,
});
