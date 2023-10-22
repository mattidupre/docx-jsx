export declare const parseProps: <TElementType extends "document" | "section" | "header" | "footer" | "paragraph" | "textrun" | "table">(inputType: TElementType, inputValue: Parameters<{
    document: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    section: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    header: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    footer: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    paragraph: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    textrun: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    table: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
}[TElementType]>[0], context: unknown) => ReturnType<{
    document: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    section: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    header: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    footer: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    paragraph: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    textrun: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
    table: <TInputValue>(inputValue: TInputValue, context: unknown) => any;
}[TElementType]>;
