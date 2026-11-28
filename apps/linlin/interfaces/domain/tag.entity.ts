export interface TagCategory {
    name: string;
}

export interface Tag {
    name: string;
    categoryName: string | null;
}
