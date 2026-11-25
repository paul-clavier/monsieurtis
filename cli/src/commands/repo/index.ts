import type { CommandGroup } from "../../command";
import { affected } from "./affected";
import { catalogCheck } from "./catalog-check";
import { sync } from "./sync";

export const repo: CommandGroup = {
    name: "repo",
    description: "Monorepo-wide tasks (affected checks, sync, catalog)",
    commands: [affected, sync, catalogCheck],
};
