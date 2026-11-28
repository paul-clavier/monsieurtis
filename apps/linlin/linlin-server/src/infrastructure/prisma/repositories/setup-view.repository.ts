import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import {
    SetupScope,
    SetupView,
    SetupViewFilters,
    TagMatch,
} from "@monsieurtis/linlin-interfaces/domain/setup-view.entity";
import { PrismaCommonRepository } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";

export type SetupViewRow = Prisma.SetupViewModel;

export const mapSetupView = (row: SetupViewRow): SetupView => ({
    id: row.id,
    name: row.name,
    query: row.query,
    tagNames: row.tagNames,
    match: row.match as TagMatch,
    scope: row.scope as SetupScope,
});

@Injectable()
export class PrismaSetupViewRepository extends PrismaCommonRepository<
    SetupView,
    SetupViewRow,
    Record<string, never>,
    SetupViewFilters
> {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    protected get delegate() {
        return this.prisma.setupView;
    }

    protected mapBase = mapSetupView;

    protected readonly filters = {};
}
