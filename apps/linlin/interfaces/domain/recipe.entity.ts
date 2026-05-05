import { Entity } from "@monsieurtis/core";
import { Setup } from "./setup.entity";

export interface RecipeRelations {
    setups: Setup[];
}

export interface Recipe extends Entity, Partial<RecipeRelations> {
    name: string;
    label: string;
    description: string;
    capacity: number | null;
    time: number;
}

export type WithSetups<T> = T & {
    setups: Setup[];
};
