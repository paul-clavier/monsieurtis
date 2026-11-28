import { SetupDomainModule } from "@/domain/setup/setup.module";
import { Module } from "@nestjs/common";
import { SetupController } from "./setup.controller";

@Module({
    imports: [SetupDomainModule],
    controllers: [SetupController],
})
export class SetupApiModule {}
