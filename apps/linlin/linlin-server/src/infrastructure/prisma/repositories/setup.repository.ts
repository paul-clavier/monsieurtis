import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import {
    Setup,
    SetupIngredient,
    SetupRelations,
} from "@/interfaces/domain/setup.entity";
import { identity } from "@monsieurtis/core";
import { PrismaCommonRepository } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";

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
            include: { ingredients: { include: { ingredient: true } } },
            map: (rows: SetupIngredientRow[]) =>
                rows.map(identity<SetupIngredient, SetupIngredientRow>),
        },
        subSetups: {
            include: { subSetups: true },
            map: (rows: SetupRow[]) => rows.map(identity<Setup, SetupRow>),
        },
    };
}
