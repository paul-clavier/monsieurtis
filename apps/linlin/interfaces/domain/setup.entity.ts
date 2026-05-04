import { Entity } from "@monsieurtis/core";
import { Ingredient } from "./ingredient.entity";

export interface Setup extends Entity {
    name: string;
    label: string;
    description: string;
    time: number;
    capacity: number | null;
}

export interface SetupIngredient {
    setupId: string;
    ingredientId: string;
    quantity: number;
    unit: string;
}

export type SetupIngredientWithIngredient = SetupIngredient & {
    ingredient: Ingredient;
};

export type SetupWithIngredientsAndSubSetups = Setup & {
    ingredients: SetupIngredientWithIngredient[];
    subSetups: Setup[];
};
