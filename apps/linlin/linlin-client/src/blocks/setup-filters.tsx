import type { SetupScope, TagMatch } from "@/api/setups";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { groupTagsByCategory } from "@/utils/tags";
import type { SetupView } from "@monsieurtis/linlin-interfaces/domain/setup-view.entity";
import type { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
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
import { CategoryChip } from "./category-chip";
import type { FilterState } from "./setup-views";
import { SetupViews } from "./setup-views";

const route = getRouteApi("/");

const SCOPES: { value: SetupScope; label: string }[] = [
    { value: "all", label: "All" },
    { value: "root", label: "Roots" },
    { value: "nested", label: "Components" },
];

interface SetupFiltersProps {
    tags: Tag[];
    views: SetupView[];
}

export const SetupFilters = ({ tags, views }: SetupFiltersProps) => {
    const search = route.useSearch();
    const navigate = route.useNavigate();
    const [query, setQuery] = useState(search.q ?? "");
    const debouncedQuery = useDebouncedValue(query, 300);
    const selectedTags = search.tags ?? [];
    const match: TagMatch = search.match ?? "any";
    const scope: SetupScope = search.scope ?? "all";

    useEffect(() => {
        const q = debouncedQuery.trim() || undefined;
        if (q === search.q) return;
        void navigate({ search: (prev) => ({ ...prev, q }), replace: true });
    }, [debouncedQuery, navigate, search.q]);

    useEffect(() => {
        if ((search.q ?? "") !== query.trim()) setQuery(search.q ?? "");
    }, [search.q]);

    const toggleTag = (name: string) =>
        void navigate({
            search: (prev) => {
                const next = new Set(prev.tags ?? []);
                if (next.has(name)) next.delete(name);
                else next.add(name);
                return { ...prev, tags: next.size > 0 ? [...next] : undefined };
            },
            replace: true,
        });

    const apply = (state: FilterState) => {
        setQuery(state.q ?? "");
        void navigate({
            search: {
                q: state.q ?? undefined,
                tags: state.tagNames.length > 0 ? state.tagNames : undefined,
                match: state.match === "any" ? undefined : state.match,
                scope: state.scope === "all" ? undefined : state.scope,
            },
            replace: true,
        });
    };

    const current: FilterState = {
        q: search.q ?? null,
        tagNames: selectedTags,
        match,
        scope,
    };
    const hasFilters = !!search.q || selectedTags.length > 0 || scope !== "all";

    return (
        <section className="filters" aria-label="Filters">
            <SetupViews views={views} current={current} onApply={apply} />
            <InputGroup className="filters-search">
                <InputGroupAddon>
                    <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search setups"
                    aria-label="Search setups"
                />
            </InputGroup>
            <div className="filters-chips">
                {groupTagsByCategory(tags).map((group) => (
                    <CategoryChip
                        key={group.category}
                        category={group.category}
                        tags={group.tags}
                        selected={selectedTags}
                        onToggle={toggleTag}
                    />
                ))}
                <span className="filters-divider" />
                <ToggleGroup
                    type="single"
                    size="sm"
                    variant="outline"
                    value={scope}
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
                    {SCOPES.map((entry) => (
                        <ToggleGroupItem key={entry.value} value={entry.value}>
                            {entry.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                {selectedTags.length > 1 && (
                    <ToggleGroup
                        type="single"
                        size="sm"
                        variant="outline"
                        value={match}
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
                            Any tag
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="all"
                            title="Has every selected tag"
                        >
                            All tags
                        </ToggleGroupItem>
                    </ToggleGroup>
                )}
                {hasFilters && (
                    <button
                        type="button"
                        className="filters-clear"
                        onClick={() =>
                            apply({
                                q: null,
                                tagNames: [],
                                match: "any",
                                scope: "all",
                            })
                        }
                    >
                        <XIcon />
                        Clear
                    </button>
                )}
            </div>
        </section>
    );
};
