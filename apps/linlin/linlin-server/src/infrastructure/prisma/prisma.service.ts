import { prismaClientOptions } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";
import { PrismaClient } from "./generated/client";

@Injectable()
export class PrismaService extends PrismaClient {
    constructor(databaseUrl: string) {
        super(prismaClientOptions(databaseUrl));
    }
}
