import { INGREDIENT_REPOSITORY } from "@/domain/injection-tokens";
import {
    Ingredient,
    IngredientFilters,
} from "@/interfaces/domain/ingredient.entity";
import type { CommonRepository } from "@monsieurtis/core";
import { CommonUseCases } from "@monsieurtis/core";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class IngredientUseCases extends CommonUseCases<
    Ingredient,
    Record<string, never>,
    IngredientFilters
> {
    constructor(
        @Inject(INGREDIENT_REPOSITORY)
        repository: CommonRepository<Ingredient, IngredientFilters>,
    ) {
        super(repository);
    }
}
