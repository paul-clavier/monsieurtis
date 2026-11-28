import { INGREDIENT_REPOSITORY } from "@/domain/injection-tokens";
import type { CommonRepository } from "@monsieurtis/core";
import { CommonUseCases } from "@monsieurtis/core";
import {
    Ingredient,
    IngredientFilters,
    IngredientRelations,
} from "@monsieurtis/linlin-interfaces/domain/ingredient.entity";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class IngredientUseCases extends CommonUseCases<
    Ingredient,
    IngredientFilters,
    IngredientRelations
> {
    constructor(
        @Inject(INGREDIENT_REPOSITORY)
        repository: CommonRepository<
            Ingredient,
            IngredientFilters,
            IngredientRelations
        >,
    ) {
        super(repository);
    }
}
