import { DeleteSetupPhotoUseCase } from "@/domain/use-cases/mutate/delete-setup-photo.use-case";
import { UploadSetupPhotoUseCase } from "@/domain/use-cases/mutate/upload-setup-photo.use-case";
import { FetchSetupPhotoFileUseCase } from "@/domain/use-cases/query/fetch-setup-photo-file.use-case";
import { RepositoriesModule } from "@/infrastructure/prisma/prisma.module";
import { S3Module } from "@/infrastructure/s3/s3.module";
import { Module } from "@nestjs/common";

const USE_CASES = [
    UploadSetupPhotoUseCase,
    DeleteSetupPhotoUseCase,
    FetchSetupPhotoFileUseCase,
];

@Module({
    imports: [RepositoriesModule, S3Module],
    providers: [...USE_CASES],
    exports: [...USE_CASES],
})
export class SetupPhotoDomainModule {}
