import { Entity, Mutable, Page, PageQuery, Query } from "../utils/query";

export interface CommonRepository<
    TEntity extends Entity,
    TFilter extends object = Record<string, never>,
    TRelations extends object = Record<string, never>,
    TCreate extends object = Mutable<TEntity>,
    TUpdate extends object = Partial<Mutable<TEntity>>,
> {
    getOne<K extends keyof TRelations = never>(
        id: string,
        query?: { include?: ReadonlyArray<K> },
    ): Promise<(TEntity & Pick<TRelations, K>) | null>;

    getAll<K extends keyof TRelations = never>(
        query?: Query<Partial<TFilter>, keyof TEntity & string, K>,
    ): Promise<Array<TEntity & Pick<TRelations, K>>>;

    getPage<K extends keyof TRelations = never>(
        query: PageQuery<Partial<TFilter>, keyof TEntity & string, K>,
    ): Promise<Page<TEntity & Pick<TRelations, K>>>;

    create(data: TCreate): Promise<string>;
    createMany(data: TCreate[]): Promise<string[]>;
    update(id: string, data: TUpdate): Promise<string>;
    updateMany(ids: string[], data: TUpdate): Promise<string[]>;
    delete(id: string): Promise<string>;
    deleteMany(ids: string[]): Promise<string[]>;
}
