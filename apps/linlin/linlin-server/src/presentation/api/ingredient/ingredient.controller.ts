import { IngredientUseCases } from "@/domain/ingredient/ingredient.use-cases";
import {
    Ingredient,
    IngredientRelations,
} from "@monsieurtis/linlin-interfaces/domain/ingredient.entity";
import {
    IngredientCreate,
    IngredientFilters,
} from "@monsieurtis/linlin-interfaces/dto/ingredient.dto";
import { CommonControllerMixin } from "@monsieurtis/nest-rest-crud";
import { Controller } from "@nestjs/common";

@Controller("ingredients")
export class IngredientController extends CommonControllerMixin<
    Ingredient,
    IngredientRelations,
    typeof IngredientCreate,
    typeof IngredientFilters
>({
    create: IngredientCreate,
    filters: IngredientFilters,
    sortFields: ["name", "label"] as const,
    relationKeys: ["tags"] as const,
}) {
    constructor(public readonly useCases: IngredientUseCases) {
        super();
    }
}
