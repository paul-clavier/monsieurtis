import { setupListQueryOptions, tagsQueryOptions } from "@/api/setups";
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

    return (
        <div className="flex flex-col gap-8">
            <SetupFilters tags={tags} />
            <p className="cookbook-hand text-xl text-muted-foreground">
                {plural(setups.length, "setup")} on these pages
            </p>
            {setups.length === 0 ? (
                <Empty className="paper-card">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <NotebookPenIcon />
                        </EmptyMedia>
                        <EmptyTitle className="cookbook-heading text-2xl">
                            Nothing on this page yet
                        </EmptyTitle>
                        <EmptyDescription>
                            Loosen the filters, or write a new setup in the
                            book.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button asChild>
                            <Link to="/setups/new">Write a setup</Link>
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <div className="setup-grid">
                    {setups.map((setup, index) => (
                        <SetupCard key={setup.id} setup={setup} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
};
