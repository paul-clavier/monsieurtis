import {
    CommonRepository,
    Entity,
    Mutable,
    Page,
    PageQuery,
    Query,
} from "@monsieurtis/core";

export interface PrismaDelegate<TRow extends Entity = Entity> {
    findUnique(args: {
        where: { id: string };
        include?: any;
    }): Promise<TRow | null>;
    findMany(args?: {
        where?: any;
        orderBy?: any;
        skip?: number;
        take?: number;
        include?: any;
    }): Promise<TRow[]>;
    count(args?: { where?: any }): Promise<number>;
    create(args: { data: any; include?: any }): Promise<TRow>;
    createMany(args: { data: any }): Promise<{ count: number }>;
    createManyAndReturn(args: {
        data: any;
        select?: { id: true };
    }): Promise<Array<Pick<TRow, "id">>>;
    update(args: { where: { id: string }; data: any }): Promise<TRow>;
    updateMany(args: { where: any; data: any }): Promise<{ count: number }>;
    delete(args: { where: { id: string } }): Promise<TRow>;
    deleteMany(args: { where: any }): Promise<{ count: number }>;
}

export interface RelationLoader<TRaw, TValue> {
    include: object;
    map: (raw: TRaw) => TValue;
    pick?: (row: any) => TRaw;
}

export type FilterFn<TValue, TWhere extends object> = (
    value: TValue,
) => Partial<TWhere>;

export abstract class PrismaCommonRepository<
    TEntity extends Entity,
    TRow extends Entity = TEntity,
    TRelations extends object = Record<string, never>,
    TFilters extends object = Record<string, never>,
    TWhere extends object = object,
    TCreate extends object = Mutable<TEntity>,
    TUpdate extends object = Partial<Mutable<TEntity>>,
    TOrderBy extends object = object,
> implements CommonRepository<TEntity, TFilters, TRelations, TCreate, TUpdate> {
    protected abstract readonly delegate: PrismaDelegate<TRow>;
    protected abstract mapBase(row: TRow): TEntity;
    protected readonly relations: {
        [K in keyof TRelations]: RelationLoader<any, TRelations[K]>;
    } = {} as never;
    protected readonly filters: {
        [K in keyof TFilters]: FilterFn<TFilters[K], TWhere>;
    } = {} as never;

    private buildInclude(
        keys: ReadonlyArray<keyof TRelations>,
    ): object | undefined {
        if (keys.length === 0) return undefined;
        return Object.fromEntries(
            keys.map((k) => [k, this.relations[k].include]),
        );
    }

    private buildWhere(filterList?: Partial<TFilters>[]): TWhere | undefined {
        if (!filterList || filterList.length === 0) return undefined;
        const branches = filterList
            .map((values) => this.buildWhereOne(values))
            .filter((w): w is TWhere => w !== undefined);
        if (branches.length === 0) return undefined;
        if (branches.length === 1) return branches[0];
        return { OR: branches } as unknown as TWhere;
    }

    private buildWhereOne(values: Partial<TFilters>): TWhere | undefined {
        const fragments = (Object.keys(values) as Array<keyof TFilters>)
            .filter((k) => values[k] !== undefined)
            .map((k) => this.filters[k](values[k] as TFilters[typeof k]));
        if (fragments.length === 0) return undefined;
        return fragments.length === 1
            ? (fragments[0] as TWhere)
            : ({ AND: fragments } as unknown as TWhere);
    }

    private buildOrderBy(sort?: {
        field: keyof TEntity & string;
        direction: "ASC" | "DESC";
    }): TOrderBy | undefined {
        if (!sort) return undefined;
        return {
            [sort.field]: sort.direction === "ASC" ? "asc" : "desc",
        } as unknown as TOrderBy;
    }

    private mapWithRelations<K extends keyof TRelations>(
        row: TRow,
        keys: ReadonlyArray<K>,
    ): TEntity & Pick<TRelations, K> {
        const out = this.mapBase(row) as TEntity & Pick<TRelations, K>;
        for (const k of keys) {
            const loader = this.relations[k];
            const raw = loader.pick
                ? loader.pick(row)
                : (row as unknown as Record<string, unknown>)[k as string];
            (out as Record<string, unknown>)[k as string] = loader.map(raw);
        }
        return out;
    }

    async getOne<K extends keyof TRelations = never>(
        id: string,
        query?: { include?: ReadonlyArray<K> },
    ): Promise<(TEntity & Pick<TRelations, K>) | null> {
        const keys = query?.include ?? ([] as ReadonlyArray<K>);
        const row = await this.delegate.findUnique({
            where: { id },
            include: this.buildInclude(keys),
        });
        return row ? this.mapWithRelations(row, keys) : null;
    }

    async getAll<K extends keyof TRelations = never>(
        query?: Query<Partial<TFilters>, keyof TEntity & string, K>,
    ): Promise<Array<TEntity & Pick<TRelations, K>>> {
        const keys = (query?.include ?? []) as ReadonlyArray<K>;
        const rows = await this.delegate.findMany({
            where: this.buildWhere(query?.filters),
            orderBy: this.buildOrderBy(query?.sort),
            include: this.buildInclude(keys),
        });
        return rows.map((r) => this.mapWithRelations(r, keys));
    }

    async getPage<K extends keyof TRelations = never>(
        query: PageQuery<Partial<TFilters>, keyof TEntity & string, K>,
    ): Promise<Page<TEntity & Pick<TRelations, K>>> {
        const keys = (query.include ?? []) as ReadonlyArray<K>;
        const where = this.buildWhere(query.filters);
        const { page, pageSize } = query.pagination;
        const [rows, total] = await Promise.all([
            this.delegate.findMany({
                where,
                orderBy: this.buildOrderBy(query.sort),
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: this.buildInclude(keys),
            }),
            this.delegate.count({ where }),
        ]);
        return {
            items: rows.map((r) => this.mapWithRelations(r, keys)),
            total,
            page,
            pageSize,
        };
    }

    async create(data: TCreate): Promise<string> {
        const row = await this.delegate.create({ data });
        return row.id;
    }

    async createMany(data: TCreate[]): Promise<string[]> {
        const rows = await this.delegate.createManyAndReturn({
            data,
            select: { id: true },
        });
        return rows.map((r) => r.id);
    }

    async update(id: string, data: TUpdate): Promise<string> {
        const row = await this.delegate.update({ where: { id }, data });
        return row.id;
    }

    async updateMany(ids: string[], data: TUpdate): Promise<string[]> {
        await this.delegate.updateMany({
            where: { id: { in: ids } } as unknown as TWhere,
            data,
        });
        return ids;
    }

    async delete(id: string): Promise<string> {
        const row = await this.delegate.delete({ where: { id } });
        return row.id;
    }

    async deleteMany(ids: string[]): Promise<string[]> {
        await this.delegate.deleteMany({
            where: { id: { in: ids } } as unknown as TWhere,
        });
        return ids;
    }
}
