import {
    BaseSetup,
    Setup,
    SetupIngredientDetail,
} from "@/interfaces/domain/setup";
import { Injectable } from "@nestjs/common";
import { Mutable, Page, PageQuery } from "@monsieurtis/core/utils/query";
import { PrismaService } from "../prisma.service";

const SETUP_INCLUDE = {
    ingredients: { include: { ingredient: true } },
    setups: true,
} as const;

const mapBaseSetup = (row: {
    id: string;
    name: string;
    label: string;
    description: string;
    time: number;
    capacity: number | null;
}): BaseSetup => ({
    id: row.id,
    name: row.name,
    label: row.label,
    description: row.description,
    time: row.time,
    capacity: row.capacity,
});

const mapSetupIngredient = (row: {
    setupId: string;
    ingredientId: string;
    quantity: number;
    unit: string;
    ingredient: { id: string; name: string; label: string };
}): SetupIngredientDetail => ({
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
    ...mapBaseSetup(row),
    ingredients: row.ingredients.map(mapSetupIngredient),
    subSetups: row.setups.map(mapBaseSetup),
});

@Injectable()
export class PrismaSetupRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getOne(id: string): Promise<Setup | null> {
        const row = await this.prisma.setup.findUnique({
            where: { id },
            include: SETUP_INCLUDE,
        });
        return row ? mapSetup(row) : null;
    }

    async getAll(): Promise<Setup[]> {
        const rows = await this.prisma.setup.findMany({
            include: SETUP_INCLUDE,
        });
        return rows.map(mapSetup);
    }

    async getPage(query: PageQuery): Promise<Page<Setup>> {
        const { page, pageSize } = query;
        const [rows, total] = await Promise.all([
            this.prisma.setup.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: SETUP_INCLUDE,
            }),
            this.prisma.setup.count(),
        ]);
        return {
            items: rows.map(mapSetup),
            total,
            page,
            pageSize,
        };
    }

    async create(data: Mutable<BaseSetup>): Promise<BaseSetup> {
        const row = await this.prisma.setup.create({ data });
        return mapBaseSetup(row);
    }

    async createMany(data: Mutable<BaseSetup>[]): Promise<number> {
        const result = await this.prisma.setup.createMany({ data });
        return result.count;
    }

    async update(
        id: string,
        data: Partial<Mutable<BaseSetup>>,
    ): Promise<BaseSetup> {
        const row = await this.prisma.setup.update({
            where: { id },
            data,
        });
        return mapBaseSetup(row);
    }

    async updateMany(
        ids: string[],
        data: Partial<Mutable<BaseSetup>>,
    ): Promise<number> {
        const result = await this.prisma.setup.updateMany({
            where: { id: { in: ids } },
            data,
        });
        return result.count;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.setup.delete({ where: { id } });
    }

    async deleteMany(ids: string[]): Promise<number> {
        const result = await this.prisma.setup.deleteMany({
            where: { id: { in: ids } },
        });
        return result.count;
    }
}
