/// <reference types="react" />
import { type ElementType, type ElementProps, RenderContext } from 'src/entities';
export type Parser = <TElementType extends ElementType>(inputType: TElementType, props: ElementProps[TElementType], context: RenderContext) => any;
export declare const defineParser: <TCallbacks extends {
    document: (props: Omit<import("docx").IDocumentOptions, "sections"> & {
        children: import("react").ReactNode;
    }) => any;
    section: (props: Omit<import("docx").ISectionOptions, "children" | "headers" | "footers"> & {
        children: import("react").ReactNode;
        headers?: {
            default?: import("react").ReactNode;
            first?: import("react").ReactNode;
            even?: import("react").ReactNode;
        } | undefined;
        footers?: {
            default?: import("react").ReactNode;
            first?: import("react").ReactNode;
            even?: import("react").ReactNode;
        } | undefined;
    }) => any;
    header: (props: {
        children: import("react").ReactNode;
    }) => any;
    footer: (props: {
        children: import("react").ReactNode;
    }) => any;
    paragraph: (props: Omit<import("docx").IParagraphOptions, "children"> & {
        children: import("react").ReactNode;
    }) => any;
    textrun: (props: Omit<import("docx").IRunOptions, "children"> & {
        children?: import("react").ReactNode;
    }) => any;
    table: (props: {}) => any;
}>(callbacks: TCallbacks) => <TElementType extends keyof ElementProps<import("react").ReactNode>>(inputType: TElementType, props: ElementProps[TElementType], context: RenderContext) => any;
