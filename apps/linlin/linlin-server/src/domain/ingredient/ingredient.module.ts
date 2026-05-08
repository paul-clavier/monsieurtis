import { RepositoriesModule } from "@/infrastructure/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { IngredientUseCases } from "./ingredient.use-cases";

@Module({
    imports: [RepositoriesModule],
    providers: [IngredientUseCases],
    exports: [IngredientUseCases],
})
export class IngredientDomainModule {}
