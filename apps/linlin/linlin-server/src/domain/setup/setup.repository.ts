import type { CommonRepository } from "@monsieurtis/core";
import {
    Setup,
    SetupCreate,
    SetupFilters,
    SetupRelations,
    SetupUpdate,
} from "@monsieurtis/linlin-interfaces/domain/setup.entity";

export type SetupRepository = CommonRepository<
    Setup,
    SetupFilters,
    SetupRelations,
    SetupCreate,
    SetupUpdate
>;
