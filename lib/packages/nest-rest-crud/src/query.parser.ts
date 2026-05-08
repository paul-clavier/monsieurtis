import { Entity, PageQuery, Query } from "@monsieurtis/core";

export interface ListQueryInput<F> {
    pagination?: { page?: number; pageSize?: number };
    sort?: { field: string; direction: "ASC" | "DESC" };
    include?: string[];
    filters?: F[];
}

const isFullPagination = (p?: {
    page?: number;
    pageSize?: number;
}): p is { page: number; pageSize: number } =>
    !!p && typeof p.page === "number" && typeof p.pageSize === "number";

const filterInclude = <K extends string>(
    parts: string[] | undefined,
    relationKeys?: ReadonlyArray<K>,
): K[] | undefined => {
    if (!parts || parts.length === 0) return undefined;
    if (!relationKeys) return parts as K[];
    return parts.filter((k): k is K =>
        (relationKeys as readonly string[]).includes(k),
    );
};

export const isPageRequest = <F>(
    q: ListQueryInput<F>,
): q is ListQueryInput<F> & {
    pagination: { page: number; pageSize: number };
} => isFullPagination(q.pagination);

export const toQuery = <E extends Entity, F, K extends string>(
    q: ListQueryInput<F>,
    relationKeys?: ReadonlyArray<K>,
    sortFields?: ReadonlyArray<keyof E & string>,
): Query<F, keyof E & string, K> => ({
    filters: q.filters,
    sort:
        q.sort && (!sortFields || sortFields.includes(q.sort.field as never))
            ? {
                  field: q.sort.field as keyof E & string,
                  direction: q.sort.direction,
              }
            : undefined,
    include: filterInclude(q.include, relationKeys),
});

export const toPageQuery = <E extends Entity, F, K extends string>(
    q: ListQueryInput<F> & {
        pagination: { page: number; pageSize: number };
    },
    relationKeys?: ReadonlyArray<K>,
    sortFields?: ReadonlyArray<keyof E & string>,
): PageQuery<F, keyof E & string, K> => ({
    ...toQuery<E, F, K>(q, relationKeys, sortFields),
    pagination: q.pagination,
});

export const parseInclude = <K extends string>(
    raw: string | undefined,
    relationKeys?: ReadonlyArray<K>,
): K[] | undefined => {
    if (!raw) return undefined;
    const parts = raw.split(",").filter((s) => s.length > 0) as K[];
    return filterInclude(parts, relationKeys);
};
