import { Entity, Mutable } from "@monsieurtis/core";
import { Ingredient } from "./ingredient.entity";
import { SetupPhoto } from "./setup-photo.entity";
import { Tag } from "./tag.entity";

export interface Setup extends Entity {
    name: string;
    label: string;
    description: string;
    time: number;
    capacity: number | null;
    dressing: string | null;
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

export type SetupWithPhotos = Setup & { photos: SetupPhoto[] };

export interface SetupRelations {
    ingredients: SetupIngredientWithIngredient[];
    subSetups: Setup[];
    parentSetups: SetupWithPhotos[];
    tags: Tag[];
    photos: SetupPhoto[];
}

export interface SetupFilters {
    name: string;
    search: string;
    tagsAll: string[];
    tagsAny: string[];
    root: boolean;
}

export type SetupCreate = Mutable<Setup> & {
    tagNames: string[];
    subSetupIds: string[];
    newSubSetups: SetupCreate[];
};

export type SetupUpdate = Partial<Mutable<Setup>>;
