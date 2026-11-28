import { SetupUseCases } from "@/domain/setup/setup.use-cases";
import {
    Setup,
    SetupRelations,
} from "@monsieurtis/linlin-interfaces/domain/setup.entity";
import {
    SetupCreate,
    SetupFilters,
    SetupUpdate,
} from "@monsieurtis/linlin-interfaces/dto/setup.dto";
import { CommonControllerMixin } from "@monsieurtis/nest-rest-crud";
import { Controller } from "@nestjs/common";

@Controller("setups")
export class SetupController extends CommonControllerMixin<
    Setup,
    SetupRelations,
    typeof SetupCreate,
    typeof SetupFilters,
    typeof SetupUpdate
>({
    create: SetupCreate,
    update: SetupUpdate,
    filters: SetupFilters,
    sortFields: ["name", "label", "time", "capacity"] as const,
    relationKeys: [
        "ingredients",
        "subSetups",
        "parentSetups",
        "tags",
        "photos",
    ] as const,
}) {
    constructor(public readonly useCases: SetupUseCases) {
        super();
    }
}
