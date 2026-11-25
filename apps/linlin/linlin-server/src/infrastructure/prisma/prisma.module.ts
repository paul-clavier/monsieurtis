import { DATABASE_URL } from "@/app.constants";
import { INGREDIENT_REPOSITORY } from "@/domain/injection-tokens";
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { PrismaIngredientRepository } from "./repositories/ingredient.repository";
import { PrismaSetupRepository } from "./repositories/setup.repository";

const repositories = [
    PrismaIngredientRepository,
    PrismaSetupRepository,
];

const tokenProviders = [
    {
        provide: INGREDIENT_REPOSITORY,
        useExisting: PrismaIngredientRepository,
    },
];

const PrismaServiceProvider = {
    provide: PrismaService,
    useFactory: () => new PrismaService(DATABASE_URL),
};

@Module({
    providers: [PrismaServiceProvider, ...repositories, ...tokenProviders],
    exports: [PrismaService, ...repositories, ...tokenProviders],
})
export class RepositoriesModule {}
