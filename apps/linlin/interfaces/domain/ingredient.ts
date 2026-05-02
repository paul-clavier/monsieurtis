import { Entity } from "../../../../lib/core/utils/query";

export interface Ingredient extends Entity {
    name: string;
    label: string;
}
