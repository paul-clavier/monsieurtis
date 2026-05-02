import { DATABASE_URL } from "@/app.constants";
import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

export const BATCH_OPERATION_LIMIT = 30000;
export const DB_CONNECTION_LIMIT = 20;

@Injectable()
export class PrismaService extends PrismaClient {
    constructor() {
        super({
            log: [
                // "event": Prisma does not print anything;
                // Instead it emits an event you subscribe to with prisma.$on("query", handler).
                // You decide what to do with it (forward to a logger, ship to a tracer, count slow queries, etc.).
                {
                    emit: "event",
                    level: "query",
                },
                {
                    emit: "stdout",
                    level: "error",
                },
                {
                    emit: "stdout",
                    level: "info",
                },
                {
                    emit: "stdout",
                    level: "warn",
                },
            ],
            datasources: {
                db: {
                    url: DATABASE_URL,
                },
            },
        });
    }
}
