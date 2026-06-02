import { Entity } from "@monsieurtis/core";
import { Ingredient } from "./ingredient.entity";

export interface SetupIngredient {
    setupId: string;
    ingredientId: string;
    ingredient: Ingredient;
    quantity: number;
    unit: string;
}
export interface SetupRelations {
    ingredients: SetupIngredient[];
    subSetups: Setup[];
}

export interface Setup extends Entity, Partial<SetupRelations> {
    name: string;
    label: string;
    description: string;
    time: number;
    capacity: number | null;
}

export type WithIngredients<T> = T & {
    ingredients: SetupIngredient[];
};

export type WithSubSetups<T> = T & {
    subSetups: Setup[];
};
