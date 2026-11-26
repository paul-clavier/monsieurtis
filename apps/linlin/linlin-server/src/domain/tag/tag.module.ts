import { FetchTagsUseCase } from "@/domain/use-cases/query/fetch-tags.use-case";
import { RepositoriesModule } from "@/infrastructure/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
    imports: [RepositoriesModule],
    providers: [FetchTagsUseCase],
    exports: [FetchTagsUseCase],
})
export class TagDomainModule {}
