import { MAX_PHOTO_BYTES } from "@/domain/setup-photo/setup-photo.error";
import { DeleteSetupPhotoUseCase } from "@/domain/use-cases/mutate/delete-setup-photo.use-case";
import { UploadSetupPhotoUseCase } from "@/domain/use-cases/mutate/upload-setup-photo.use-case";
import { FetchSetupPhotoFileUseCase } from "@/domain/use-cases/query/fetch-setup-photo-file.use-case";
import {
    BadRequestException,
    Controller,
    Delete,
    Get,
    Header,
    Param,
    ParseUUIDPipe,
    Post,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller()
export class SetupPhotoController {
    constructor(
        private readonly uploadSetupPhotoUseCase: UploadSetupPhotoUseCase,
        private readonly deleteSetupPhotoUseCase: DeleteSetupPhotoUseCase,
        private readonly fetchSetupPhotoFileUseCase: FetchSetupPhotoFileUseCase,
    ) {}

    @Post("setups/:setupId/photos")
    @UseInterceptors(
        FileInterceptor("file", { limits: { fileSize: MAX_PHOTO_BYTES } }),
    )
    upload(
        @Param("setupId", ParseUUIDPipe) setupId: string,
        @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    ) {
        if (!file)
            throw new BadRequestException('Missing multipart field "file"');
        return this.uploadSetupPhotoUseCase.execute({
            setupId,
            content: file.buffer,
            contentType: file.mimetype,
        });
    }

    @Get("photos/:id/file")
    @Header("Cache-Control", "public, max-age=31536000, immutable")
    async file(@Param("id", ParseUUIDPipe) id: string) {
        const photo = await this.fetchSetupPhotoFileUseCase.execute({ id });
        return new StreamableFile(photo.content, { type: photo.contentType });
    }

    @Delete("photos/:id")
    async delete(@Param("id", ParseUUIDPipe) id: string) {
        return { id: await this.deleteSetupPhotoUseCase.execute({ id }) };
    }
}
