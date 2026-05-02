import { Entity } from "../../../../lib/core/utils/query";
import { Ingredient } from "./ingredient";

export interface BaseSetup extends Entity {
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

export type SetupIngredientDetail = SetupIngredient & {
    ingredient: Ingredient;
};

export type Setup = BaseSetup & {
    ingredients: SetupIngredientDetail[];
    subSetups: BaseSetup[];
};
