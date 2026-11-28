import { Entity, Mutable } from "@monsieurtis/core";

export interface SetupPhoto extends Entity {
    setupId: string;
    key: string;
    contentType: string;
}

export interface SetupPhotoFilters {
    setupId: string;
}

export type SetupPhotoCreate = Mutable<SetupPhoto>;
