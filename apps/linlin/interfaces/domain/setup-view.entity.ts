import { Entity, Mutable } from "@monsieurtis/core";

export type TagMatch = "any" | "all";
export type SetupScope = "all" | "root" | "nested";

export interface SetupView extends Entity {
    name: string;
    query: string | null;
    tagNames: string[];
    match: TagMatch;
    scope: SetupScope;
}

export type SetupViewFilters = Record<string, never>;

export type SetupViewCreate = Mutable<SetupView>;
