import {
    PHOTO_STORAGE,
    SETUP_PHOTO_REPOSITORY,
} from "@/domain/injection-tokens";
import type { PhotoStorage } from "@/domain/setup-photo/photo-storage.client";
import { SetupPhotoNotFoundError } from "@/domain/setup-photo/setup-photo.error";
import type { SetupPhotoRepository } from "@/domain/setup-photo/setup-photo.repository";
import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../use-case";

export interface DeleteSetupPhotoPort {
    id: string;
}

export type DeleteSetupPhotoResult = string;

@Injectable()
export class DeleteSetupPhotoUseCase implements UseCase<
    DeleteSetupPhotoPort,
    DeleteSetupPhotoResult
> {
    constructor(
        @Inject(SETUP_PHOTO_REPOSITORY)
        private readonly setupPhotoRepository: SetupPhotoRepository,
        @Inject(PHOTO_STORAGE)
        private readonly photoStorage: PhotoStorage,
    ) {}

    async execute(port: DeleteSetupPhotoPort): Promise<DeleteSetupPhotoResult> {
        const photo = await this.setupPhotoRepository.getOne(port.id);
        if (!photo) throw new SetupPhotoNotFoundError({ id: port.id });
        const id = await this.setupPhotoRepository.delete(photo.id);
        await this.photoStorage.delete([photo.key]);
        return id;
    }
}
