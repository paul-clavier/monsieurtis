import type { TagRepository } from "@/domain/tag/tag.repository";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PrismaTagRepository implements TagRepository {
    constructor(private readonly prisma: PrismaService) {}

    getAll(): Promise<Tag[]> {
        return this.prisma.tag.findMany({
            where: { setups: { some: {} } },
            orderBy: { name: "asc" },
        });
    }
}
