import {
    PHOTO_STORAGE,
    SETUP_PHOTO_REPOSITORY,
    SETUP_REPOSITORY,
} from "@/domain/injection-tokens";
import type { PhotoStorage } from "@/domain/setup-photo/photo-storage.client";
import {
    ACCEPTED_PHOTO_TYPES,
    InvalidPhotoError,
    MAX_PHOTO_BYTES,
} from "@/domain/setup-photo/setup-photo.error";
import type { SetupPhotoRepository } from "@/domain/setup-photo/setup-photo.repository";
import { SetupNotFoundError } from "@/domain/setup/setup.error";
import type { SetupRepository } from "@/domain/setup/setup.repository";
import { SetupPhoto } from "@monsieurtis/linlin-interfaces/domain/setup-photo.entity";
import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { UseCase } from "../use-case";

export interface UploadSetupPhotoPort {
    setupId: string;
    content: Uint8Array;
    contentType: string;
}

export type UploadSetupPhotoResult = SetupPhoto;

const EXTENSIONS: Record<(typeof ACCEPTED_PHOTO_TYPES)[number], string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
};

const isAcceptedType = (
    contentType: string,
): contentType is (typeof ACCEPTED_PHOTO_TYPES)[number] =>
    (ACCEPTED_PHOTO_TYPES as readonly string[]).includes(contentType);

@Injectable()
export class UploadSetupPhotoUseCase implements UseCase<
    UploadSetupPhotoPort,
    UploadSetupPhotoResult
> {
    constructor(
        @Inject(SETUP_REPOSITORY)
        private readonly setupRepository: SetupRepository,
        @Inject(SETUP_PHOTO_REPOSITORY)
        private readonly setupPhotoRepository: SetupPhotoRepository,
        @Inject(PHOTO_STORAGE)
        private readonly photoStorage: PhotoStorage,
    ) {}

    async execute(port: UploadSetupPhotoPort): Promise<UploadSetupPhotoResult> {
        if (!isAcceptedType(port.contentType)) {
            throw new InvalidPhotoError(
                `Unsupported photo type "${port.contentType}"`,
            );
        }
        if (port.content.byteLength === 0) {
            throw new InvalidPhotoError("The photo is empty");
        }
        if (port.content.byteLength > MAX_PHOTO_BYTES) {
            throw new InvalidPhotoError("The photo is larger than 10 MB");
        }

        const setup = await this.setupRepository.getOne(port.setupId);
        if (!setup) throw new SetupNotFoundError({ id: port.setupId });

        const key = `setups/${setup.id}/${randomUUID()}.${EXTENSIONS[port.contentType]}`;
        await this.photoStorage.put(key, port.content, port.contentType);

        const photo = {
            setupId: setup.id,
            key,
            contentType: port.contentType,
        };
        try {
            const id = await this.setupPhotoRepository.create(photo);
            return { id, ...photo };
        } catch (error) {
            await this.photoStorage.delete([key]);
            throw error;
        }
    }
}
