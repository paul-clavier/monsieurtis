import { Ingredient } from "@/interfaces/domain/ingredient";
import { Mutable, Page, PageQuery } from "@monsieurtis/core/utils/query";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

const mapIngredient = (row: {
    id: string;
    name: string;
    label: string;
}): Ingredient => ({
    id: row.id,
    name: row.name,
    label: row.label,
});

@Injectable()
export class PrismaIngredientRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getOne(id: string): Promise<Ingredient | null> {
        const row = await this.prisma.ingredient.findUnique({ where: { id } });
        return row ? mapIngredient(row) : null;
    }

    async getAll(): Promise<Ingredient[]> {
        const rows = await this.prisma.ingredient.findMany();
        return rows.map(mapIngredient);
    }

    async getPage(query: PageQuery): Promise<Page<Ingredient>> {
        const { page, pageSize } = query;
        const [rows, total] = await Promise.all([
            this.prisma.ingredient.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.ingredient.count(),
        ]);
        return {
            items: rows.map(mapIngredient),
            total,
            page,
            pageSize,
        };
    }

    async create(data: Mutable<Ingredient>): Promise<Ingredient> {
        const row = await this.prisma.ingredient.create({ data });
        return mapIngredient(row);
    }

    async createMany(data: Mutable<Ingredient>[]): Promise<number> {
        const result = await this.prisma.ingredient.createMany({ data });
        return result.count;
    }

    async update(
        id: string,
        data: Partial<Mutable<Ingredient>>,
    ): Promise<Ingredient> {
        const row = await this.prisma.ingredient.update({
            where: { id },
            data,
        });
        return mapIngredient(row);
    }

    async updateMany(
        ids: string[],
        data: Partial<Mutable<Ingredient>>,
    ): Promise<number> {
        const result = await this.prisma.ingredient.updateMany({
            where: { id: { in: ids } },
            data,
        });
        return result.count;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.ingredient.delete({ where: { id } });
    }

    async deleteMany(ids: string[]): Promise<number> {
        const result = await this.prisma.ingredient.deleteMany({
            where: { id: { in: ids } },
        });
        return result.count;
    }
}
