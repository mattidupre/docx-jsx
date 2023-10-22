import { type ElementType, type ElementProps } from 'src/entities';
export type Parser = <TElementType extends ElementType>(inputType: TElementType, props: ElementProps[TElementType]) => any;
export declare const defineParser: <TCallbacks extends {
    document: (props: unknown) => any;
    pagesGroup: (props: unknown) => any;
    paragraph: (props: unknown) => any;
    table: (props: unknown) => any;
    header: (props: unknown) => any;
    footer: (props: unknown) => any;
    textrun: (props: unknown) => any;
}>(callbacks: TCallbacks) => <TElementType extends "document" | "pagesGroup" | "paragraph" | "table" | "header" | "footer" | "textrun">(inputType: TElementType, props: ElementProps[TElementType]) => any;
