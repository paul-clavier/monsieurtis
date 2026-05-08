import type {
    AssertEquals,
    PageQueryParams,
    RawListQuery,
    SortDirection,
} from "@monsieurtis/core";
import { z } from "zod";

export const PaginationSchema = z.object({
    page: z.coerce.number().int().min(1),
    pageSize: z.coerce.number().int().min(1).max(500),
});
export type PaginationInput = z.infer<typeof PaginationSchema>;

export const SortSchema = z.object({
    field: z.string().min(1),
    direction: z.enum(["ASC", "DESC"]),
});
export type SortInput = z.infer<typeof SortSchema>;

const csvToArray = (val: unknown): unknown =>
    typeof val === "string" ? val.split(",").filter((s) => s.length > 0) : val;

export const IncludeQuerySchema = z.preprocess(
    csvToArray,
    z.array(z.string()).optional(),
);

// Drift guards: these schemas must keep matching @monsieurtis/core's query contracts.
const _paginationMatchesCore: AssertEquals<PaginationInput, PageQueryParams> =
    true;
const _sortDirectionMatchesCore: AssertEquals<
    SortInput["direction"],
    SortDirection
> = true;
void _paginationMatchesCore;
void _sortDirectionMatchesCore;

/**
 * Builds the schema used to validate the query string of the `list` route.
 *
 * - `pagination` is optional. If both `page` and `pageSize` are present we return a `PageQuery`,
 *   else a `Query` (`getAll`).
 * - `filters` is a list of objects (OR across, AND within).
 *   If a single filters object is passed (the common case), it is normalised into a 1-element list.
 * - `sort` is `field:direction` (e.g. `name:DESC`).
 * - `include` is comma-separated relation keys.
 */
export const makeListQuerySchema = <F extends z.ZodTypeAny>(filters?: F) => {
    const filtersSchema = filters
        ? z.preprocess(
              (val) => (Array.isArray(val) ? val : val ? [val] : undefined),
              z.array(filters).optional(),
          )
        : z.undefined();

    return z.object({
        pagination: PaginationSchema.partial().optional(),
        sort: z
            .preprocess((val) => {
                if (typeof val !== "string") return val;
                const [field, direction] = val.split(":");
                return field && direction ? { field, direction } : undefined;
            }, SortSchema.optional())
            .optional(),
        include: IncludeQuerySchema,
        filters: filtersSchema,
    });
};

// Drift guard: makeListQuerySchema's output must match @monsieurtis/core's RawListQuery.
type _SampleFilters = z.ZodObject<{ search: z.ZodString }>;
type _SampleListQueryInferred = z.infer<
    ReturnType<typeof makeListQuerySchema<_SampleFilters>>
>;
const _listQueryMatchesCore: AssertEquals<
    _SampleListQueryInferred,
    RawListQuery<{ search: string }>
> = true;
void _listQueryMatchesCore;
