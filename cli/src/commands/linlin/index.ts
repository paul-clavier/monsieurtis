import type { CommandGroup } from "../../command";
import { entityNew } from "./entity";
import { migrationApply, migrationNew } from "./migration";
import { up } from "./up";

export const linlin: CommandGroup = {
    name: "linlin",
    description: "Linlin app",
    commands: [up, migrationNew, migrationApply, entityNew],
};
