import { PHOTO_STORAGE } from "@/domain/injection-tokens";
import type { PhotoStorage } from "@/domain/setup-photo/photo-storage.client";
import { Provider } from "@nestjs/common";
import { S3PhotoStorage } from "./s3.client";

export const PhotoStorageProvider: Provider<PhotoStorage> = {
    provide: PHOTO_STORAGE,
    useClass: S3PhotoStorage,
};
