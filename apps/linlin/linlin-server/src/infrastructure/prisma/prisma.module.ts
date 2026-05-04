import { DATABASE_URL } from "@/app.constants";
import { PrismaService } from "@monsieurtis/prisma";
import { Module } from "@nestjs/common";
import { PrismaIngredientRepository } from "./repositories/ingredient.repository";
import { PrismaRecipeRepository } from "./repositories/recipe.repository";
import { PrismaSetupRepository } from "./repositories/setup.repository";

const repositories = [
    PrismaIngredientRepository,
    PrismaRecipeRepository,
    PrismaSetupRepository,
];

const PrismaServiceProvider = {
    provide: PrismaService,
    useFactory: () => new PrismaService(DATABASE_URL),
};

@Module({
    providers: [PrismaServiceProvider, ...repositories],
    exports: [PrismaService, ...repositories],
})
export class RepositoriesModule {}
