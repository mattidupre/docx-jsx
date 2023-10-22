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
type ElementType = keyof typeof SCHEMA;
type ElementOptions = {
    document: Record<string, never>;
    pagesGroup: Record<string, never>;
    header: Record<string, never>;
    footer: Record<string, never>;
    paragraph: Record<string, never>;
    textrun: Record<string, never>;
    table: Record<string, never>;
};
type ParseSchemaToProps<TValue extends Record<string, any>> = {
    [T in keyof TValue]: TValue[T] extends ElementType ? ReactNode : TValue[T] extends ReadonlyArray<infer I extends ElementType> ? ParseSchemaToProps<(typeof SCHEMA)[I]> : TValue[T] extends Record<string, any> ? ParseSchemaToProps<TValue[T]> : never;
};
export type ElementProps = {
    [TElementType in ElementType]: ElementOptions[TElementType] & ParseSchemaToProps<(typeof SCHEMA)[TElementType]>;
};
export {};
