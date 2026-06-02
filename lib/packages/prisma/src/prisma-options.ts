export const BATCH_OPERATION_LIMIT = 30000;
export const DB_CONNECTION_LIMIT = 20;

export const prismaClientOptions = (databaseUrl: string) => ({
    log: [
        // "event": Prisma does not print anything;
        // Instead it emits an event you subscribe to with prisma.$on("query", handler).
        // You decide what to do with it (forward to a logger, ship to a tracer, count slow queries, etc.).
        {
            emit: "event" as const,
            level: "query" as const,
        },
        {
            emit: "stdout" as const,
            level: "error" as const,
        },
        {
            emit: "stdout" as const,
            level: "info" as const,
        },
        {
            emit: "stdout" as const,
            level: "warn" as const,
        },
    ],
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
});
