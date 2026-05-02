export interface Entity {
    id: string;
}

export type Mutable<T extends Entity> = Omit<T, "id">;

export interface PageQuery {
    page: number;
    pageSize: number;
}

export interface Page<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}
