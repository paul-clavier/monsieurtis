import { Entity } from "../../../../lib/core/utils/query";
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
