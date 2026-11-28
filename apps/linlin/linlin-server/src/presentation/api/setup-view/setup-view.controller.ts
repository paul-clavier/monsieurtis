import { SetupViewUseCases } from "@/domain/setup-view/setup-view.use-cases";
import { SetupView } from "@monsieurtis/linlin-interfaces/domain/setup-view.entity";
import {
    SetupViewCreate,
    SetupViewFilters,
    SetupViewUpdate,
} from "@monsieurtis/linlin-interfaces/dto/setup-view.dto";
import { CommonControllerMixin } from "@monsieurtis/nest-rest-crud";
import { Controller } from "@nestjs/common";

@Controller("setup-views")
export class SetupViewController extends CommonControllerMixin<
    SetupView,
    Record<string, never>,
    typeof SetupViewCreate,
    typeof SetupViewFilters,
    typeof SetupViewUpdate
>({
    create: SetupViewCreate,
    update: SetupViewUpdate,
    filters: SetupViewFilters,
    sortFields: ["name"] as const,
    relationKeys: [] as const,
}) {
    constructor(public readonly useCases: SetupViewUseCases) {
        super();
    }
}
