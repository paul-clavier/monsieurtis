import { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";

export interface TagRepository {
    getAll(): Promise<Tag[]>;
}
