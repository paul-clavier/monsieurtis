import { IngredientDomainModule } from "@/domain/ingredient/ingredient.module";
import { Module } from "@nestjs/common";
import { IngredientController } from "./ingredient.controller";

@Module({
    imports: [IngredientDomainModule],
    controllers: [IngredientController],
})
export class IngredientApiModule {}
