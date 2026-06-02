import { CommonRepository } from "../infrastructure/common.repository";
import { Entity, Mutable, Page, PageQuery, Query } from "../utils/query";

/**
 * `CommonUseCases` is the per-entity façade that exposes the 9 standard CRUD
 * methods as thin pass-throughs to a `CommonRepository`. A concrete subclass
 * adds `@Injectable()` and resolves the repository through DI.
 *
 * Override one method to splice domain logic in (extra side effects,
 * validation, fan-out to other repositories) — the other 8 stay inherited.
 *
 * The base class is framework-free: no `@Injectable()` here so this package
 * stays Nest-agnostic.
 */
export abstract class CommonUseCases<
    TEntity extends Entity,
    TFilter extends object = Record<string, never>,
    TRelations extends object = Record<string, never>,
    TCreate extends object = Mutable<TEntity>,
    TUpdate extends object = Partial<Mutable<TEntity>>,
> {
    constructor(
        protected readonly repository: CommonRepository<
            TEntity,
            TFilter,
            TRelations,
            TCreate,
            TUpdate
        >,
    ) {}

    getOne<K extends keyof TRelations = never>(
        id: string,
        query?: { include?: ReadonlyArray<K> },
    ): Promise<(TEntity & Pick<TRelations, K>) | null> {
        return this.repository.getOne(id, query);
    }

    getAll<K extends keyof TRelations = never>(
        query?: Query<Partial<TFilter>, keyof TEntity & string, K>,
    ): Promise<Array<TEntity & Pick<TRelations, K>>> {
        return this.repository.getAll(query);
    }

    getPage<K extends keyof TRelations = never>(
        query: PageQuery<Partial<TFilter>, keyof TEntity & string, K>,
    ): Promise<Page<TEntity & Pick<TRelations, K>>> {
        return this.repository.getPage(query);
    }

    create(data: TCreate): Promise<string> {
        return this.repository.create(data);
    }

    createMany(data: TCreate[]): Promise<string[]> {
        return this.repository.createMany(data);
    }

    update(id: string, data: TUpdate): Promise<string> {
        return this.repository.update(id, data);
    }

    updateMany(ids: string[], data: TUpdate): Promise<string[]> {
        return this.repository.updateMany(ids, data);
    }

    delete(id: string): Promise<string> {
        return this.repository.delete(id);
    }

    deleteMany(ids: string[]): Promise<string[]> {
        return this.repository.deleteMany(ids);
    }
}
