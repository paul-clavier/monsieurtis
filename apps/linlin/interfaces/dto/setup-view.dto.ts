import { z } from "zod";
import { TagName } from "./setup.dto";

export const SetupViewCreate = z.object({
    name: z.string().trim().min(1, "Name your view").max(60),
    query: z.string().trim().min(1).nullable(),
    tagNames: z.array(TagName),
    match: z.enum(["any", "all"]),
    scope: z.enum(["all", "root", "nested"]),
});

export const SetupViewUpdate = SetupViewCreate.partial();

export const SetupViewFilters = z.object({});

export type SetupViewCreateDTO = z.infer<typeof SetupViewCreate>;
