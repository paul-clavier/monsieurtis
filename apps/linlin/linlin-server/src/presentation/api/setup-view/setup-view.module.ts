import { SetupViewDomainModule } from "@/domain/setup-view/setup-view.module";
import { Module } from "@nestjs/common";
import { SetupViewController } from "./setup-view.controller";

@Module({
    imports: [SetupViewDomainModule],
    controllers: [SetupViewController],
})
export class SetupViewApiModule {}
