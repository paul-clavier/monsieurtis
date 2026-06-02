import { Entity, Mutable } from "@monsieurtis/core";

export interface IngredientFilters {
    search: string;
}
export interface Ingredient extends Entity {
    name: string;
    label: string;
}

export interface IngredientCreate extends Mutable<Ingredient> {}
