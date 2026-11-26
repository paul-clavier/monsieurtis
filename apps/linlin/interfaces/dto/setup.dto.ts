import { z } from "zod";

const csvToArray = (value: unknown): unknown =>
    typeof value === "string"
        ? value.split(",").filter((part) => part.length > 0)
        : value;

export const TagName = z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[^,]+$/, "Tags cannot contain commas");

export const SetupCreate = z.object({
    name: z
        .string()
        .trim()
        .min(1, "A slug is required")
        .regex(
            /^[a-z0-9]+(-[a-z0-9]+)*$/,
            "Lowercase letters, digits and dashes",
        ),
    label: z.string().trim().min(1, "Give your setup a title"),
    description: z.string().trim(),
    time: z.number().int().min(0, "Time cannot be negative"),
    capacity: z.number().int().min(1, "Serves at least one").nullable(),
    dressing: z.string().trim().nullable(),
    tagNames: z.array(TagName),
    subSetupIds: z.array(z.uuid()),
});

export const SetupUpdate = SetupCreate.omit({
    tagNames: true,
    subSetupIds: true,
}).partial();

export const SetupFilters = z.object({
    search: z.string().trim().min(1).optional(),
    tagsAll: z.preprocess(csvToArray, z.array(TagName).min(1)).optional(),
    tagsAny: z.preprocess(csvToArray, z.array(TagName).min(1)).optional(),
    root: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
});

export type SetupCreateInput = z.input<typeof SetupCreate>;
export type SetupCreateDTO = z.infer<typeof SetupCreate>;
export type SetupUpdateDTO = z.infer<typeof SetupUpdate>;
export type SetupFiltersParams = z.input<typeof SetupFilters>;
