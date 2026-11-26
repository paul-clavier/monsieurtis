import { DomainError, ObjectNotFoundError } from "@/utils/errors";
import { SetupPhoto } from "@monsieurtis/linlin-interfaces/domain/setup-photo.entity";

export const ACCEPTED_PHOTO_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
] as const;

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export class SetupPhotoNotFoundError extends ObjectNotFoundError<
    Pick<SetupPhoto, "id">
> {
    constructor(identifiers: Partial<Pick<SetupPhoto, "id">>) {
        super("SetupPhoto", identifiers);
    }
}

export class InvalidPhotoError extends DomainError {
    constructor(reason: string) {
        super("InvalidPhoto", reason);
    }
}
