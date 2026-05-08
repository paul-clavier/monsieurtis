import { z } from "zod";

export const IngredientCreate = z.object({
    name: z.string().min(1),
    label: z.string().min(1),
});

export const IngredientFilters = z.object({
    search: z.string().min(1),
});

export type IngredientCreateDTO = z.infer<typeof IngredientCreate>;
export type IngredientFiltersParams = z.infer<typeof IngredientFilters>;
