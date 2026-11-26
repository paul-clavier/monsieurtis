import { setupOptionsQueryOptions, tagsQueryOptions } from "@/api/setups";
import type { SetupFormSubmit } from "@/blocks/setup-form";
import { SetupForm } from "@/blocks/setup-form";
import { useCreateSetup } from "@/hooks/use-setup-mutations";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export const NewSetupPage = () => {
    const navigate = useNavigate();
    const router = useRouter();
    const { data: setups } = useSuspenseQuery(setupOptionsQueryOptions());
    const { data: tags } = useSuspenseQuery(tagsQueryOptions());
    const createSetup = useCreateSetup();

    const onSubmit = (values: SetupFormSubmit) =>
        createSetup.mutate(values, {
            onSuccess: ({ id, failedPhotos }) => {
                if (failedPhotos.length > 0) {
                    toast.warning(
                        `Saved, but ${failedPhotos.length} photo(s) could not be uploaded`,
                    );
                } else {
                    toast.success(`${values.setup.label} is in the book`);
                }
                void navigate({
                    to: "/setups/$setupId",
                    params: { setupId: id },
                });
            },
            onError: (error) => toast.error(error.message),
        });

    return (
        <article className="paper-card recipe-sheet mx-auto max-w-3xl">
            <header className="mb-8 text-center">
                <p className="cookbook-hand text-2xl text-primary">
                    a new page
                </p>
                <h1 className="cookbook-heading text-4xl">
                    Write down a setup
                </h1>
                <div className="cookbook-rule mx-auto mt-4 max-w-xs" />
            </header>
            <SetupForm
                setups={setups}
                tags={tags}
                submitting={createSetup.isPending}
                onSubmit={onSubmit}
                onCancel={() => router.history.back()}
            />
        </article>
    );
};
