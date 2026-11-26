import { SETUP_VIEW_REPOSITORY } from "@/domain/injection-tokens";
import { CommonUseCases } from "@monsieurtis/core";
import {
    SetupView,
    SetupViewFilters,
} from "@monsieurtis/linlin-interfaces/domain/setup-view.entity";
import { Inject, Injectable } from "@nestjs/common";
import type { SetupViewRepository } from "./setup-view.repository";

@Injectable()
export class SetupViewUseCases extends CommonUseCases<
    SetupView,
    SetupViewFilters
> {
    constructor(
        @Inject(SETUP_VIEW_REPOSITORY) repository: SetupViewRepository,
    ) {
        super(repository);
    }
}
