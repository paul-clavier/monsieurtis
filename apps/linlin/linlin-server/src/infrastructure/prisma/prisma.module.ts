import { DATABASE_URL } from "@/app.constants";
import {
    INGREDIENT_REPOSITORY,
    SETUP_PHOTO_REPOSITORY,
    SETUP_REPOSITORY,
    TAG_REPOSITORY,
} from "@/domain/injection-tokens";
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { PrismaIngredientRepository } from "./repositories/ingredient.repository";
import { PrismaSetupPhotoRepository } from "./repositories/setup-photo.repository";
import { PrismaSetupRepository } from "./repositories/setup.repository";
import { PrismaTagRepository } from "./repositories/tag.repository";

const repositories = [
    PrismaIngredientRepository,
    PrismaSetupRepository,
    PrismaSetupPhotoRepository,
    PrismaTagRepository,
];

const tokenProviders = [
    {
        provide: INGREDIENT_REPOSITORY,
        useExisting: PrismaIngredientRepository,
    },
    {
        provide: SETUP_REPOSITORY,
        useExisting: PrismaSetupRepository,
    },
    {
        provide: SETUP_PHOTO_REPOSITORY,
        useExisting: PrismaSetupPhotoRepository,
    },
    {
        provide: TAG_REPOSITORY,
        useExisting: PrismaTagRepository,
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
