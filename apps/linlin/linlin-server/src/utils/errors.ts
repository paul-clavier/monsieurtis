export class DomainError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = code;
    }
}

export class ObjectNotFoundError<T extends object> extends DomainError {
    constructor(
        public readonly entity: string,
        public readonly identifiers: Partial<T>,
    ) {
        super(
            `${entity}NotFound`,
            `${entity} not found: ${JSON.stringify(identifiers)}`,
        );
    }
}

export class ConflictError extends DomainError {}
