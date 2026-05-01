// _______________________________
// PAGINATION

export interface PaginationQuery {
  page: number;
  size: number;
}

export const DEFAULT_PAGINATION_QUERY: PaginationQuery = {
  page: 1,
  size: 50,
};

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

// _______________________________
// SORT

export type SortDirection = "ASC" | "DESC";

export interface SortQuery {
  field: string;
  direction: SortDirection;
}

// _______________________________
// FILTER

