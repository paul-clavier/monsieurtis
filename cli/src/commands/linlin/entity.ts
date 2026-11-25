import type { Command } from "../../command";
import { error } from "../../utils/log";
import { repoPath } from "../../utils/paths";
import { scaffoldEntity } from "../../utils/scaffold-entity";

/** `tis linlin entity-new <Entity>`: scaffolds a CRUD entity in linlin-server. */
export const entityNew: Command = {
    name: "entity-new",
    description:
        "Scaffold a CRUD entity in linlin-server (<Entity>, PascalCase)",
    run: ([entity]) => {
        if (!entity || !/^[A-Z][A-Za-z0-9]*$/.test(entity)) {
            error(
                "usage: tis linlin entity-new <Entity> (PascalCase, e.g. Recipe)",
            );
            return Promise.resolve(1);
        }
        scaffoldEntity({
            entity,
            serverDir: repoPath("apps/linlin/linlin-server"),
            interfacesDir: repoPath("apps/linlin/interfaces"),
        });
        return Promise.resolve(0);
    },
};
