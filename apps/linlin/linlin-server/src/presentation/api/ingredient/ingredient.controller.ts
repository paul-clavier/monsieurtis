import { IngredientUseCases } from "@/domain/ingredient/ingredient.use-cases";
import { Ingredient } from "@/interfaces/domain/ingredient.entity";
import {
    IngredientCreate,
    IngredientFilters,
} from "@/interfaces/dto/ingredient.dto";
import { CommonControllerMixin } from "@monsieurtis/nest-rest-crud";
import { Controller } from "@nestjs/common";

@Controller("ingredients")
export class IngredientController extends CommonControllerMixin<
    Ingredient,
    Record<string, never>,
    typeof IngredientCreate,
    typeof IngredientFilters
>({
    create: IngredientCreate,
    filters: IngredientFilters,
    sortFields: ["name", "label"] as const,
}) {
    constructor(public readonly useCases: IngredientUseCases) {
        super();
    }
}
