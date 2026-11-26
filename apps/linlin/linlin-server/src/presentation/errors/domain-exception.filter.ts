import {
    ConflictError,
    DomainError,
    ObjectNotFoundError,
} from "@/utils/errors";
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

const statusOf = (error: DomainError): HttpStatus => {
    if (error instanceof ObjectNotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof ConflictError) return HttpStatus.CONFLICT;
    return HttpStatus.UNPROCESSABLE_ENTITY;
};

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
    catch(error: DomainError, host: ArgumentsHost) {
        const status = statusOf(error);
        host.switchToHttp().getResponse<Response>().status(status).json({
            statusCode: status,
            code: error.code,
            message: error.message,
        });
    }
}
