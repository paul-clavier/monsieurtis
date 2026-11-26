import { ConflictError, ObjectNotFoundError } from "@/utils/errors";
import { Setup } from "@monsieurtis/linlin-interfaces/domain/setup.entity";

export class SetupNotFoundError extends ObjectNotFoundError<
    Pick<Setup, "id" | "name">
> {
    constructor(identifiers: Partial<Pick<Setup, "id" | "name">>) {
        super("Setup", identifiers);
    }
}

export class SetupAlreadyExistsError extends ConflictError {
    constructor(name: string) {
        super("SetupAlreadyExists", `A setup named "${name}" already exists`);
    }
}
