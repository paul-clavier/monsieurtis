export interface Entity {
    id: string;
}

export type Mutable<T extends Entity> = Omit<T, "id">;

export type SortDirection = "ASC" | "DESC";

export interface PageQueryParams {
    page: number;
    pageSize: number;
}

export interface Page<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

export interface Query<TFilter, TSort, TInclude> {
    filters?: TFilter;
    sort?: { field: TSort; direction: SortDirection };
    include?: TInclude[];
}

export interface PageQuery<TFilter, TSort, TInclude> extends Query<
    TFilter,
    TSort,
    TInclude
> {
    pagination: PageQueryParams;
}
