import { RepositoriesModule } from "@/infrastructure/prisma/prisma.module";
import { S3Module } from "@/infrastructure/s3/s3.module";
import { Module } from "@nestjs/common";
import { SetupUseCases } from "./setup.use-cases";

@Module({
    imports: [RepositoriesModule, S3Module],
    providers: [SetupUseCases],
    exports: [SetupUseCases],
})
export class SetupDomainModule {}
