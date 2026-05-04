import { Entity } from "@monsieurtis/core";
import { Setup } from "./setup.entity";

export interface Recipe extends Entity {
    name: string;
    label: string;
    description: string;
    capacity: number | null;
    time: number;
}

export interface RecipeWithSetups extends Recipe {
    setups: Setup[];
}
