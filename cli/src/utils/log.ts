const COLORS = {
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    dim: "\x1b[2m",
    reset: "\x1b[0m",
} as const;

export type Color = Exclude<keyof typeof COLORS, "reset">;

export const paint = (color: Color, text: string): string =>
    `${COLORS[color]}${text}${COLORS.reset}`;

export const info = (message: string): void =>
    console.log(`${paint("cyan", "tis")} ${message}`);

export const error = (message: string): void =>
    console.error(`${paint("red", "tis")} ${message}`);
