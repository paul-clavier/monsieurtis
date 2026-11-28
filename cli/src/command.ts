/** A leaf command: `tis <group> <name> [...args]`. */
export interface Command {
    name: string;
    description: string;
    run: (args: string[]) => Promise<number>;
}

/** A group of commands, usually one per app: `tis <group> ...`. */
export interface CommandGroup {
    name: string;
    description: string;
    commands: Command[];
}
