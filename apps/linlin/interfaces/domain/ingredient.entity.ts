import { Entity } from "@monsieurtis/core";

export interface IngredientFilters {
    search: string;
}
export interface Ingredient extends Entity {
    name: string;
    label: string;
}
