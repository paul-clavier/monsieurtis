import { useCreateView, useDeleteView } from "@/hooks/use-view-mutations";
import type {
    SetupScope,
    SetupView,
    TagMatch,
} from "@monsieurtis/linlin-interfaces/domain/setup-view.entity";
import { Button } from "@monsieurtis/ui/components/button";
import { Input } from "@monsieurtis/ui/components/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@monsieurtis/ui/components/popover";
import { BookmarkPlusIcon, XIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

export interface FilterState {
    q: string | null;
    tagNames: string[];
    match: TagMatch;
    scope: SetupScope;
}

interface SetupViewsProps {
    views: SetupView[];
    current: FilterState;
    onApply: (state: FilterState) => void;
}

const normalize = (state: FilterState) => ({
    q: state.q?.trim() || null,
    tags: [...state.tagNames].sort().join("\u0000"),
    match: state.tagNames.length > 1 ? state.match : "any",
    scope: state.scope,
});

const sameFilters = (a: FilterState, b: FilterState) => {
    const left = normalize(a);
    const right = normalize(b);
    return (
        left.q === right.q &&
        left.tags === right.tags &&
        left.match === right.match &&
        left.scope === right.scope
    );
};

const toState = (view: SetupView): FilterState => ({
    q: view.query,
    tagNames: view.tagNames,
    match: view.match,
    scope: view.scope,
});

const EMPTY: FilterState = {
    q: null,
    tagNames: [],
    match: "any",
    scope: "all",
};

export const SetupViews = ({ views, current, onApply }: SetupViewsProps) => {
    const [name, setName] = useState("");
    const [open, setOpen] = useState(false);
    const createView = useCreateView();
    const deleteView = useDeleteView();
    const isEmpty = sameFilters(current, EMPTY);
    const activeView = views.find((view) =>
        sameFilters(toState(view), current),
    );

    const save = (event: FormEvent) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        createView.mutate(
            {
                name: trimmed,
                query: current.q?.trim() || null,
                tagNames: current.tagNames,
                match: current.match,
                scope: current.scope,
            },
            {
                onSuccess: () => {
                    setName("");
                    setOpen(false);
                    toast.success(`View “${trimmed}” saved`);
                },
                onError: (error) => toast.error(error.message),
            },
        );
    };

    return (
        <div className="views" role="tablist" aria-label="Views">
            <button
                type="button"
                role="tab"
                className="view-tab"
                aria-selected={isEmpty}
                onClick={() => onApply(EMPTY)}
            >
                All setups
            </button>
            {views.map((view) => (
                <span key={view.id} className="view-tab-wrap">
                    <button
                        type="button"
                        role="tab"
                        className="view-tab"
                        aria-selected={activeView?.id === view.id}
                        onClick={() => onApply(toState(view))}
                    >
                        {view.name}
                    </button>
                    <button
                        type="button"
                        className="view-tab-remove"
                        aria-label={`Delete view ${view.name}`}
                        onClick={() =>
                            deleteView.mutate(view.id, {
                                onError: (error) => toast.error(error.message),
                            })
                        }
                    >
                        <XIcon />
                    </button>
                </span>
            ))}
            {!isEmpty && !activeView && (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button type="button" className="view-save">
                            <BookmarkPlusIcon />
                            Save as view
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="view-save-menu">
                        <form onSubmit={save} className="flex flex-col gap-3">
                            <Input
                                autoFocus
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                placeholder="Name this view"
                                maxLength={60}
                                aria-label="View name"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={!name.trim() || createView.isPending}
                            >
                                Save view
                            </Button>
                        </form>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
};
