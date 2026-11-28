import { RepositoriesModule } from "@/infrastructure/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { SetupViewUseCases } from "./setup-view.use-cases";

@Module({
    imports: [RepositoriesModule],
    providers: [SetupViewUseCases],
    exports: [SetupViewUseCases],
})
export class SetupViewDomainModule {}
