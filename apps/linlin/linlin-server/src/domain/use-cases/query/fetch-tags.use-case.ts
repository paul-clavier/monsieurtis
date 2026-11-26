import { TAG_REPOSITORY } from "@/domain/injection-tokens";
import type { TagRepository } from "@/domain/tag/tag.repository";
import { Tag } from "@monsieurtis/linlin-interfaces/domain/tag.entity";
import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../use-case";

export type FetchTagsPort = void;
export type FetchTagsResult = Tag[];

@Injectable()
export class FetchTagsUseCase implements UseCase<
    FetchTagsPort,
    FetchTagsResult
> {
    constructor(
        @Inject(TAG_REPOSITORY)
        private readonly tagRepository: TagRepository,
    ) {}

    execute(): Promise<FetchTagsResult> {
        return this.tagRepository.getAll();
    }
}
