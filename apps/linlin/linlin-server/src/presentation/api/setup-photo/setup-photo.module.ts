import { SetupPhotoDomainModule } from "@/domain/setup-photo/setup-photo.module";
import { Module } from "@nestjs/common";
import { SetupPhotoController } from "./setup-photo.controller";

@Module({
    imports: [SetupPhotoDomainModule],
    controllers: [SetupPhotoController],
})
export class SetupPhotoApiModule {}
