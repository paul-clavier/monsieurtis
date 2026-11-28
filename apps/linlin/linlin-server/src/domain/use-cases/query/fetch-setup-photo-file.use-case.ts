import {
    PHOTO_STORAGE,
    SETUP_PHOTO_REPOSITORY,
} from "@/domain/injection-tokens";
import type {
    PhotoStorage,
    StoredPhoto,
} from "@/domain/setup-photo/photo-storage.client";
import { SetupPhotoNotFoundError } from "@/domain/setup-photo/setup-photo.error";
import type { SetupPhotoRepository } from "@/domain/setup-photo/setup-photo.repository";
import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../use-case";

export interface FetchSetupPhotoFilePort {
    id: string;
}

export type FetchSetupPhotoFileResult = StoredPhoto;

@Injectable()
export class FetchSetupPhotoFileUseCase implements UseCase<
    FetchSetupPhotoFilePort,
    FetchSetupPhotoFileResult
> {
    constructor(
        @Inject(SETUP_PHOTO_REPOSITORY)
        private readonly setupPhotoRepository: SetupPhotoRepository,
        @Inject(PHOTO_STORAGE)
        private readonly photoStorage: PhotoStorage,
    ) {}

    async execute(
        port: FetchSetupPhotoFilePort,
    ): Promise<FetchSetupPhotoFileResult> {
        const photo = await this.setupPhotoRepository.getOne(port.id);
        if (!photo) throw new SetupPhotoNotFoundError({ id: port.id });
        const stored = await this.photoStorage.get(photo.key);
        if (!stored) throw new SetupPhotoNotFoundError({ id: port.id });
        return stored;
    }
}
