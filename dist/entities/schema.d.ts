import { type ReactNode } from 'react';
export declare const SCHEMA: {
    readonly document: {
        readonly children: readonly ["pagesGroup"];
    };
    readonly pagesGroup: {
        readonly children: readonly ["paragraph", "table"];
        readonly headers: {
            readonly default: "header";
            readonly even: "header";
            readonly odd: "header";
            readonly first: "header";
        };
        readonly footers: {
            readonly default: "header";
            readonly even: "header";
            readonly odd: "header";
            readonly first: "header";
        };
    };
    readonly header: {
        readonly children: readonly ["header"];
    };
    readonly footer: {
        readonly children: readonly ["footer"];
    };
    readonly paragraph: {
        readonly children: readonly ["textrun"];
    };
    readonly textrun: {
        readonly children: readonly ["textrun"];
    };
    readonly table: {};
};
type Options = {
    document: Record<string, never>;
    pagesGroup: Record<string, never>;
    header: Record<string, never>;
    footer: Record<string, never>;
    paragraph: Record<string, never>;
    textrun: Record<string, never>;
    table: Record<string, never>;
};
export type ElementType = keyof typeof SCHEMA;
type ApplySchemaRecursive<TValue extends Record<string, any>, TChild> = {
    [T in keyof TValue]: TValue[T] extends ElementType ? undefined | TChild : TValue[T] extends ReadonlyArray<infer I extends ElementType> ? NonNullable<ApplySchemaRecursive<(typeof SCHEMA)[I], TChild>> : TValue[T] extends Record<string, any> ? ApplySchemaRecursive<TValue[T], TChild> : never;
};
type ApplySchema<TChild> = {
    [TElementType in ElementType]: Options[ElementType] & ApplySchemaRecursive<typeof SCHEMA, TChild>;
};
export type DocumentHtml = ApplySchema<string>;
export type ElementProps = ApplySchema<ReactNode>;
export type ParserOptions = ApplySchema<any>;
export {};
