import {
    setupListQueryOptions,
    tagsQueryOptions,
    viewsQueryOptions,
} from "@/api/setups";
import { SetupCard } from "@/blocks/setup-card";
import { SetupFilters } from "@/blocks/setup-filters";
import { plural } from "@/utils/format";
import { Button } from "@monsieurtis/ui/components/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@monsieurtis/ui/components/empty";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { NotebookPenIcon } from "lucide-react";

const route = getRouteApi("/");

export const SetupsPage = () => {
    const search = route.useSearch();
    const { data: setups } = useSuspenseQuery(setupListQueryOptions(search));
    const { data: tags } = useSuspenseQuery(tagsQueryOptions());
    const { data: views } = useSuspenseQuery(viewsQueryOptions());

    return (
        <div className="flex flex-col gap-6">
            <SetupFilters tags={tags} views={views} />
            <p className="eyebrow">{plural(setups.length, "setup")}</p>
            {setups.length === 0 ? (
                <Empty className="surface">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <NotebookPenIcon />
                        </EmptyMedia>
                        <EmptyTitle className="heading">
                            Nothing matches
                        </EmptyTitle>
                        <EmptyDescription>
                            Loosen the filters, or add a new setup.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button asChild>
                            <Link to="/setups/new">New setup</Link>
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <div className="setup-grid">
                    {setups.map((setup) => (
                        <SetupCard key={setup.id} setup={setup} />
                    ))}
                </div>
            )}
        </div>
    );
};
