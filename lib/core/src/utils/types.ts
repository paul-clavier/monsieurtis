// Use this class to debug complex types
// https://stackoverflow.com/questions/61412688/how-to-view-full-type-definition-on-hover-in-vscode-typescript#answer-76527542
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export type FromArray<T> = T extends (infer K)[] ? K : never;

export type AssertEquals<A, B> = [A] extends [B]
    ? [B] extends [A]
        ? true
        : never
    : never;
