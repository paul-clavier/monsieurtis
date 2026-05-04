import { Entity } from "@monsieurtis/core";
import { Setup } from "./setup";

export interface Recipe extends Entity {
    name: string;
    label: string;
    description: string;
    capacity: number | null;
    time: number;
}

export interface RecipeDetail extends Recipe {
    setups: Setup[];
}
