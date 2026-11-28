#!/usr/bin/env bun
import type { CommandGroup } from "./command";
import { linlin } from "./commands/linlin";
import { repo } from "./commands/repo";
import { error, paint } from "./utils/log";

const GROUPS: CommandGroup[] = [repo, linlin];

const usage = (group?: CommandGroup): string => {
    if (group) {
        const width = Math.max(...group.commands.map((c) => c.name.length));
        return [
            `Usage: tis ${group.name} <command>`,
            "",
            ...group.commands.map(
                (c) =>
                    `  ${c.name.padEnd(width)}  ${paint("dim", c.description)}`,
            ),
        ].join("\n");
    }
    const width = Math.max(...GROUPS.map((g) => g.name.length));
    return [
        "Usage: tis <group> <command>",
        "",
        ...GROUPS.map(
            (g) => `  ${g.name.padEnd(width)}  ${paint("dim", g.description)}`,
        ),
    ].join("\n");
};

const isHelp = (arg: string | undefined): boolean =>
    arg === undefined || arg === "-h" || arg === "--help" || arg === "help";

const main = async (argv: string[]): Promise<number> => {
    const [groupName, commandName, ...rest] = argv;

    if (isHelp(groupName)) {
        console.log(usage());
        return 0;
    }

    const group = GROUPS.find((g) => g.name === groupName);
    if (!group) {
        error(`unknown group "${groupName}"\n`);
        console.log(usage());
        return 1;
    }

    if (isHelp(commandName)) {
        console.log(usage(group));
        return 0;
    }

    const command = group.commands.find((c) => c.name === commandName);
    if (!command) {
        error(`unknown command "${group.name} ${commandName}"\n`);
        console.log(usage(group));
        return 1;
    }

    return command.run(rest);
};

process.exit(await main(process.argv.slice(2)));
