import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { identity } from "@monsieurtis/core";
import {
    Setup,
    SetupCreate,
    SetupFilters,
    SetupIngredientWithIngredient,
    SetupRelations,
    SetupUpdate,
} from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import { PrismaCommonRepository } from "@monsieurtis/prisma";
import { Injectable } from "@nestjs/common";
import { mapSetupPhoto, SetupPhotoRow } from "./setup-photo.repository";

type SetupRow = Prisma.SetupModel;
type SetupIngredientRow = Prisma.SetupIngredientGetPayload<{
    include: { ingredient: true };
}>;
type TagRow = Prisma.TagModel;

const mapSetup = (row: SetupRow): Setup => ({
    id: row.id,
    name: row.name,
    label: row.label,
    description: row.description,
    time: row.time,
    capacity: row.capacity,
    dressing: row.dressing,
});

const insensitive = (value: string) => ({
    contains: value,
    mode: "insensitive" as const,
});

@Injectable()
export class PrismaSetupRepository extends PrismaCommonRepository<
    Setup,
    SetupRow,
    SetupRelations,
    SetupFilters,
    Prisma.SetupWhereInput,
    SetupCreate,
    SetupUpdate
> {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    protected get delegate() {
        return this.prisma.setup;
    }

    protected mapBase = mapSetup;

    protected readonly relations = {
        ingredients: {
            include: { ingredients: { include: { ingredient: true } } },
            map: (rows: SetupIngredientRow[]) =>
                rows.map(
                    identity<SetupIngredientWithIngredient, SetupIngredientRow>,
                ),
        },
        subSetups: {
            include: { subSetups: { orderBy: { label: "asc" as const } } },
            map: (rows: SetupRow[]) => rows.map(mapSetup),
        },
        parentSetups: {
            include: {
                parentSetups: {
                    orderBy: { label: "asc" as const },
                    include: {
                        photos: {
                            orderBy: { createdAt: "asc" as const },
                            take: 1,
                        },
                    },
                },
            },
            map: (rows: (SetupRow & { photos: SetupPhotoRow[] })[]) =>
                rows.map((row) => ({
                    ...mapSetup(row),
                    photos: row.photos.map(mapSetupPhoto),
                })),
        },
        tags: {
            include: { tags: { orderBy: { name: "asc" as const } } },
            map: (rows: TagRow[]) => rows.map(identity<Tag, TagRow>),
        },
        photos: {
            include: { photos: { orderBy: { createdAt: "asc" as const } } },
            map: (rows: SetupPhotoRow[]) => rows.map(mapSetupPhoto),
        },
    };

    protected readonly filters = {
        name: (name: string) => ({ name }),
        search: (query: string) => ({
            OR: [
                { label: insensitive(query) },
                { description: insensitive(query) },
            ],
        }),
        tagsAll: (names: string[]) => ({
            AND: names.map((name) => ({ tags: { some: { name } } })),
        }),
        tagsAny: (names: string[]) => ({
            tags: { some: { name: { in: names } } },
        }),
        root: (isRoot: boolean) =>
            isRoot
                ? { parentSetups: { none: {} } }
                : { parentSetups: { some: {} } },
    };

    override async create(data: SetupCreate): Promise<string> {
        const row = await this.prisma.setup.create({
            data: this.toCreateInput(data),
            select: { id: true },
        });
        return row.id;
    }

    override async createMany(data: SetupCreate[]): Promise<string[]> {
        const rows = await this.prisma.$transaction(
            data.map((setup) =>
                this.prisma.setup.create({
                    data: this.toCreateInput(setup),
                    select: { id: true },
                }),
            ),
        );
        return rows.map((row) => row.id);
    }

    private toCreateInput({
        tagNames,
        subSetupIds,
        newSubSetups,
        ...scalars
    }: SetupCreate): Prisma.SetupCreateInput {
        return {
            ...scalars,
            tags: {
                connectOrCreate: [...new Set(tagNames)].map((name) => ({
                    where: { name },
                    create: { name },
                })),
            },
            subSetups: {
                connect: [...new Set(subSetupIds)].map((id) => ({ id })),
                create: newSubSetups.map((child) => this.toCreateInput(child)),
            },
        };
    }
}
