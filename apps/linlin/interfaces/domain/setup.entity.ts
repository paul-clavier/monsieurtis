import { Entity } from "@monsieurtis/core";
import { Ingredient } from "./ingredient.entity";
import { Tag } from "./tag.entity";

export interface SetupIngredient {
    setupId: string;
    ingredientId: string;
    ingredient: Ingredient;
    quantity: number;
    unit: string;
    tags?: Tag[];
}
export interface SetupRelations {
    ingredients: SetupIngredient[];
    subSetups: Setup[];
    tags: Tag[];
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
