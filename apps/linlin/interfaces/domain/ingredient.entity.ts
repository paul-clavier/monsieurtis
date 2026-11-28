import { Entity, Mutable } from "@monsieurtis/core";
import { Tag } from "./tag.entity";

export interface IngredientFilters {
    search: string;
}
export interface IngredientRelations {
    tags: Tag[];
}

export interface Ingredient extends Entity, Partial<IngredientRelations> {
    name: string;
    label: string;
}

export type IngredientCreate = Mutable<Ingredient>;
