import type { SetupScope, TagMatch } from "@/api/setups";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import { Button } from "@monsieurtis/ui/components/button";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@monsieurtis/ui/components/input-group";
import {
    ToggleGroup,
    ToggleGroupItem,
} from "@monsieurtis/ui/components/toggle-group";
import { getRouteApi } from "@tanstack/react-router";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

const route = getRouteApi("/");

interface SetupFiltersProps {
    tags: Tag[];
}

export const SetupFilters = ({ tags }: SetupFiltersProps) => {
    const search = route.useSearch();
    const navigate = route.useNavigate();
    const [query, setQuery] = useState(search.q ?? "");
    const debouncedQuery = useDebouncedValue(query, 300);
    const selectedTags = search.tags ?? [];
    const hasFilters =
        !!search.q ||
        selectedTags.length > 0 ||
        (search.scope ?? "all") !== "all";

    useEffect(() => {
        const q = debouncedQuery.trim() || undefined;
        if (q === search.q) return;
        void navigate({ search: (prev) => ({ ...prev, q }), replace: true });
    }, [debouncedQuery, navigate, search.q]);

    return (
        <section className="paper-card filter-panel" aria-label="Filters">
            <div className="flex flex-wrap items-center gap-4">
                <InputGroup className="min-w-56 flex-1">
                    <InputGroupAddon>
                        <SearchIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Look something up…"
                        aria-label="Search setups"
                    />
                </InputGroup>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={search.scope ?? "all"}
                    onValueChange={(value) =>
                        value &&
                        void navigate({
                            search: (prev) => ({
                                ...prev,
                                scope:
                                    value === "all"
                                        ? undefined
                                        : (value as SetupScope),
                            }),
                            replace: true,
                        })
                    }
                    aria-label="Setup scope"
                >
                    <ToggleGroupItem value="all">All</ToggleGroupItem>
                    <ToggleGroupItem value="root">Roots only</ToggleGroupItem>
                    <ToggleGroupItem value="nested">Components</ToggleGroupItem>
                </ToggleGroup>
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                    <span className="filter-label">Tags</span>
                    <ToggleGroup
                        type="single"
                        size="sm"
                        variant="outline"
                        value={search.match ?? "any"}
                        onValueChange={(value) =>
                            value &&
                            void navigate({
                                search: (prev) => ({
                                    ...prev,
                                    match:
                                        value === "any"
                                            ? undefined
                                            : (value as TagMatch),
                                }),
                                replace: true,
                            })
                        }
                        aria-label="Tag matching"
                    >
                        <ToggleGroupItem
                            value="any"
                            title="Has any selected tag"
                        >
                            any (OR)
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="all"
                            title="Has every selected tag"
                        >
                            all (AND)
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <ToggleGroup
                        type="multiple"
                        spacing={1}
                        className="tag-chooser flex-wrap"
                        value={selectedTags}
                        onValueChange={(value) => {
                            const toggled = [
                                ...value.filter(
                                    (tag) => !selectedTags.includes(tag),
                                ),
                                ...selectedTags.filter(
                                    (tag) => !value.includes(tag),
                                ),
                            ];
                            void navigate({
                                search: (prev) => {
                                    const next = new Set(prev.tags ?? []);
                                    toggled.forEach((tag) =>
                                        next.has(tag)
                                            ? next.delete(tag)
                                            : next.add(tag),
                                    );
                                    return {
                                        ...prev,
                                        tags:
                                            next.size > 0
                                                ? [...next]
                                                : undefined,
                                    };
                                },
                                replace: true,
                            });
                        }}
                        aria-label="Tags"
                    >
                        {tags.map((tag) => (
                            <ToggleGroupItem
                                key={tag.name}
                                value={tag.name}
                                size="sm"
                                className="tag-chip"
                            >
                                {tag.name}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>
            )}

            {hasFilters && (
                <Button
                    variant="link"
                    size="sm"
                    className="self-start px-0"
                    onClick={() => {
                        setQuery("");
                        void navigate({ search: {}, replace: true });
                    }}
                >
                    <XIcon />
                    Clear filters
                </Button>
            )}
        </section>
    );
};
