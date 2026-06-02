import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { Recipe, RecipeRelations } from "@/interfaces/domain/recipe.entity";
import {
    Setup,
    WithIngredients,
    WithSubSetups,
} from "@/interfaces/domain/setup.entity";
import { identity } from "@monsieurtis/core";
import { PrismaCommonRepository } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";
import { SetupWithIngredientsAndSubSetupsRow } from "./setup.repository";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type RecipeRow = Prisma.RecipeGetPayload<{}>;

@Injectable()
export class PrismaRecipeRepository extends PrismaCommonRepository<
    Recipe,
    RecipeRow,
    RecipeRelations
> {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    protected get delegate() {
        return this.prisma.recipe;
    }

    protected mapBase = identity<Recipe, RecipeRow>;

    protected readonly relations = {
        setups: {
            include: {
                setups: {
                    include: {
                        ingredients: { include: { ingredient: true } },
                        subSetups: true,
                    },
                },
            },
            map: (rows: SetupWithIngredientsAndSubSetupsRow[]) =>
                rows.map(
                    identity<
                        WithIngredients<WithSubSetups<Setup>>,
                        SetupWithIngredientsAndSubSetupsRow
                    >,
                ),
        },
    };
}
