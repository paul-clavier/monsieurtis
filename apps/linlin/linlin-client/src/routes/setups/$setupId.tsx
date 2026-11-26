import { setupQueryOptions } from "@/api/setups";
import { SetupDetailPage } from "@/pages/setup-detail-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/setups/$setupId")({
    loader: ({ context: { queryClient }, params }) =>
        queryClient.ensureQueryData(setupQueryOptions(params.setupId)),
    component: SetupDetailPage,
});
