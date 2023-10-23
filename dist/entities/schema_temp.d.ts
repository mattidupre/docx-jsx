import { type ReactNode } from 'react';
export declare const SCHEMA: {
    readonly document: {
        readonly temp: any;
        readonly children: any;
    };
    readonly pagesGroup: {
        readonly headers: {
            readonly default: any;
            readonly even: any;
            readonly odd: any;
            readonly first: any;
        };
        readonly children: any;
        readonly footers: {
            readonly default: any;
            readonly even: any;
            readonly odd: any;
            readonly first: any;
        };
    };
    readonly header: {
        readonly children: any;
    };
    readonly footer: {
        readonly children: any;
    };
    readonly paragraph: {
        readonly children: any;
    };
    readonly textrun: {
        readonly children: any;
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
