export declare const parseProps: <TElementType extends "document" | "section" | "header" | "footer" | "paragraph" | "textrun" | "table">(inputType: TElementType, inputValue: Parameters<{
    document: (inputValue: any, context: unknown) => any;
    section: (inputValue: any, context: unknown) => any;
    header: (inputValue: any, context: unknown) => any;
    footer: (inputValue: any, context: unknown) => any;
    paragraph: (inputValue: any, context: unknown) => any;
    textrun: (inputValue: any, context: unknown) => any;
    table: (inputValue: any, context: unknown) => any;
}[TElementType]>[0], context: unknown) => ReturnType<{
    document: (inputValue: any, context: unknown) => any;
    section: (inputValue: any, context: unknown) => any;
    header: (inputValue: any, context: unknown) => any;
    footer: (inputValue: any, context: unknown) => any;
    paragraph: (inputValue: any, context: unknown) => any;
    textrun: (inputValue: any, context: unknown) => any;
    table: (inputValue: any, context: unknown) => any;
}[TElementType]>;
