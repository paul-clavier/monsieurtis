import type { CommonRepository } from "@monsieurtis/core";
import {
    SetupView,
    SetupViewFilters,
} from "@monsieurtis/linlin-interfaces/domain/setup-view.entity";

export type SetupViewRepository = CommonRepository<SetupView, SetupViewFilters>;
