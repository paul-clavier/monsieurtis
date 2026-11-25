import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { identity } from "@monsieurtis/core";
import {
    Ingredient,
    IngredientFilters,
    IngredientRelations,
} from "@monsieurtis/linlin-interfaces/domain/ingredient.entity";
import { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import { PrismaCommonRepository } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type IngredientRow = Prisma.IngredientGetPayload<{}>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type TagRow = Prisma.TagGetPayload<{}>;

@Injectable()
export class PrismaIngredientRepository extends PrismaCommonRepository<
    Ingredient,
    IngredientRow,
    IngredientRelations,
    IngredientFilters
> {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    protected get delegate() {
        return this.prisma.ingredient;
    }

    protected mapBase = identity<Ingredient, IngredientRow>;

    protected readonly relations = {
        tags: {
            include: { tags: true },
            map: (rows: TagRow[]) => rows.map(identity<Tag, TagRow>),
        },
    };

    protected readonly filters = {
        search: (q: string) => ({
            name: { contains: q, mode: "insensitive" as const },
        }),
    };
}
