import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { identity } from "@monsieurtis/core";
import {
    Setup,
    SetupIngredient,
    SetupRelations,
} from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import { PrismaCommonRepository } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type SetupRow = Prisma.SetupGetPayload<{}>;
export type SetupWithIngredientsAndSubSetupsRow = Prisma.SetupGetPayload<{
    include: {
        ingredients: { include: { ingredient: true } };
        subSetups: true;
    };
}>;
export type SetupIngredientRow = Prisma.SetupIngredientGetPayload<{
    include: { ingredient: true };
}>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type TagRow = Prisma.TagGetPayload<{}>;

@Injectable()
export class PrismaSetupRepository extends PrismaCommonRepository<
    Setup,
    SetupRow,
    SetupRelations
> {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    protected get delegate() {
        return this.prisma.setup;
    }

    protected mapBase = identity<Setup, SetupRow>;

    protected readonly relations = {
        ingredients: {
            include: {
                ingredients: { include: { ingredient: true } },
            },
            map: (rows: SetupIngredientRow[]) =>
                rows.map(identity<SetupIngredient, SetupIngredientRow>),
        },
        subSetups: {
            include: { subSetups: true },
            map: (rows: SetupRow[]) => rows.map(identity<Setup, SetupRow>),
        },
        tags: {
            include: { tags: true },
            map: (rows: TagRow[]) => rows.map(identity<Tag, TagRow>),
        },
    };
}
