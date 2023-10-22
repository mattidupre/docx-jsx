import { type ReactNode } from 'react';
import { type ISectionOptions, type IDocumentOptions, type IParagraphOptions, type IRunOptions } from 'docx';
export type ElementType = 'document' | 'section' | 'header' | 'footer' | 'paragraph' | 'textrun' | 'table';
export type ElementProps<TNode = ReactNode> = {
    document: Omit<IDocumentOptions, 'sections'> & {
        children: TNode;
    };
    section: Omit<ISectionOptions, 'children' | 'headers' | 'footers'> & {
        children: TNode;
        headers?: {
            default?: TNode;
            first?: TNode;
            even?: TNode;
        };
        footers?: {
            default?: TNode;
            first?: TNode;
            even?: TNode;
        };
    };
    header: {
        children: TNode;
    };
    footer: {
        children: TNode;
    };
    paragraph: Omit<IParagraphOptions, 'children'> & {
        children: TNode;
    };
    textrun: Omit<IRunOptions, 'children'> & {
        children?: TNode;
    };
    table: never;
};
export declare const PROPS_PARSERS: {
    readonly document: ({ children, ...options }: IntrinsicElementProps, { renderChildren }: RenderContext) => any;
    readonly section: ({ children, headers, footers }: IntrinsicElementProps, { renderChildren, renderChild }: RenderContext) => {
        children: any;
        headers: {
            [x: string]: unknown;
            [x: number]: unknown;
            [x: symbol]: unknown;
        };
        footers: {
            [x: string]: unknown;
            [x: number]: unknown;
            [x: symbol]: unknown;
        };
    };
    readonly header: ({ children }: IntrinsicElementProps, { renderChildren }: RenderContext) => {
        children: any;
    };
    readonly footer: ({ children }: IntrinsicElementProps, { renderChildren }: RenderContext) => {
        children: any;
    };
    readonly paragraph: ({ children, ...options }: IntrinsicElementProps, { renderChildren }: RenderContext) => any;
    readonly textrun: ({ children, ...options }: IntrinsicElementProps, { renderChildren }: RenderContext) => any;
    readonly table: (props: Record<string, never>) => Record<string, never>;
};
