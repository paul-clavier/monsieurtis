import type { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";

export const OTHER_CATEGORY = "Other";

export interface TagGroup<T extends Tag = Tag> {
    category: string;
    tags: T[];
}

export const groupTagsByCategory = <T extends Tag>(
    tags: T[],
): TagGroup<T>[] => {
    const groups = new Map<string, T[]>();
    for (const tag of tags) {
        const category = tag.categoryName ?? OTHER_CATEGORY;
        groups.set(category, [...(groups.get(category) ?? []), tag]);
    }
    return [...groups.entries()]
        .map(([category, items]) => ({
            category,
            tags: [...items].sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => {
            if (a.category === OTHER_CATEGORY) return 1;
            if (b.category === OTHER_CATEGORY) return -1;
            return a.category.localeCompare(b.category);
        });
};
