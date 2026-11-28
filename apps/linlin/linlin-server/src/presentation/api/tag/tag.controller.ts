import { FetchTagsUseCase } from "@/domain/use-cases/query/fetch-tags.use-case";
import { Controller, Get } from "@nestjs/common";

@Controller("tags")
export class TagController {
    constructor(private readonly fetchTagsUseCase: FetchTagsUseCase) {}

    @Get("/")
    list() {
        return this.fetchTagsUseCase.execute();
    }
}
