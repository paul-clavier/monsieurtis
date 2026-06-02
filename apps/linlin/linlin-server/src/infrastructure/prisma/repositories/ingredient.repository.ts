import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import {
    Ingredient,
    IngredientFilters,
} from "@/interfaces/domain/ingredient.entity";
import { identity } from "@monsieurtis/core";
import { PrismaCommonRepository } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type IngredientRow = Prisma.IngredientGetPayload<{}>;
@Injectable()
export class PrismaIngredientRepository extends PrismaCommonRepository<
    Ingredient,
    IngredientRow,
    Record<string, never>,
    IngredientFilters
> {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    protected get delegate() {
        return this.prisma.ingredient;
    }

    protected mapBase = identity<Ingredient, IngredientRow>;

    protected readonly filters = {
        search: (q: string) => ({
            name: { contains: q, mode: "insensitive" as const },
        }),
    };
}
