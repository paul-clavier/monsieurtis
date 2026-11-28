import type { CommonRepository } from "@monsieurtis/core";
import {
    SetupPhoto,
    SetupPhotoFilters,
} from "@monsieurtis/linlin-interfaces/domain/setup-photo.entity";

export type SetupPhotoRepository = CommonRepository<
    SetupPhoto,
    SetupPhotoFilters
>;
