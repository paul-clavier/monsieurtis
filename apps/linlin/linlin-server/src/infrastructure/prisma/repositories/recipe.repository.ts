import { Recipe, RecipeDetail } from "@/interfaces/domain/recipe";
import { Setup, SetupIngredientDetail } from "@/interfaces/domain/setup";
import { Mutable, Page, PageQuery } from "@monsieurtis/core";
import { PrismaService } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";

const RECIPE_INCLUDE = {
    setups: {
        include: {
            ingredients: { include: { ingredient: true } },
            setups: true,
        },
    },
} as const;

const mapRecipe = (row: {
    id: string;
    name: string;
    label: string;
    description: string;
    capacity: number | null;
    time: number;
}): Recipe => ({
    id: row.id,
    name: row.name,
    label: row.label,
    description: row.description,
    capacity: row.capacity,
    time: row.time,
});

const mapSetupIngredient = (row: any): SetupIngredientDetail => ({
    setupId: row.setupId,
    ingredientId: row.ingredientId,
    quantity: row.quantity,
    unit: row.unit,
    ingredient: {
        id: row.ingredient.id,
        name: row.ingredient.name,
        label: row.ingredient.label,
    },
});

const mapSetup = (row: any): Setup => ({
    id: row.id,
    name: row.name,
    label: row.label,
    description: row.description,
    time: row.time,
    capacity: row.capacity,
    ingredients: row.ingredients.map(mapSetupIngredient),
    subSetups: row.setups.map((s: any) => ({
        id: s.id,
        name: s.name,
        label: s.label,
        description: s.description,
        time: s.time,
        capacity: s.capacity,
    })),
});

const mapRecipeDetail = (row: any): RecipeDetail => ({
    ...mapRecipe(row),
    setups: row.setups.map(mapSetup),
});

@Injectable()
export class PrismaRecipeRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getOne(id: string): Promise<RecipeDetail | null> {
        const row = await this.prisma.recipe.findUnique({
            where: { id },
            include: RECIPE_INCLUDE,
        });
        return row ? mapRecipeDetail(row) : null;
    }

    async getAll(): Promise<RecipeDetail[]> {
        const rows = await this.prisma.recipe.findMany({
            include: RECIPE_INCLUDE,
        });
        return rows.map(mapRecipeDetail);
    }

    async getPage(query: PageQuery): Promise<Page<RecipeDetail>> {
        const { page, pageSize } = query;
        const [rows, total] = await Promise.all([
            this.prisma.recipe.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: RECIPE_INCLUDE,
            }),
            this.prisma.recipe.count(),
        ]);
        return {
            items: rows.map(mapRecipeDetail),
            total,
            page,
            pageSize,
        };
    }

    async create(data: Mutable<Recipe>): Promise<Recipe> {
        const row = await this.prisma.recipe.create({ data });
        return mapRecipe(row);
    }

    async createMany(data: Mutable<Recipe>[]): Promise<number> {
        const result = await this.prisma.recipe.createMany({ data });
        return result.count;
    }

    async update(id: string, data: Partial<Mutable<Recipe>>): Promise<Recipe> {
        const row = await this.prisma.recipe.update({
            where: { id },
            data,
        });
        return mapRecipe(row);
    }

    async updateMany(
        ids: string[],
        data: Partial<Mutable<Recipe>>,
    ): Promise<number> {
        const result = await this.prisma.recipe.updateMany({
            where: { id: { in: ids } },
            data,
        });
        return result.count;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.recipe.delete({ where: { id } });
    }

    async deleteMany(ids: string[]): Promise<number> {
        const result = await this.prisma.recipe.deleteMany({
            where: { id: { in: ids } },
        });
        return result.count;
    }
}
