import { type RenderContext, type Parser } from 'src/entities';
import { type ReactNode } from 'react';
export declare const ELEMENT_RENDERERS: {
    readonly document: ({ children, ...options }: IntrinsicElementProps, { renderChildren }: RenderContext) => any;
    readonly section: ({ children, headers, footers }: IntrinsicElementProps, { renderChildren, renderChild }: RenderContext) => {
        children: readonly ReactElement[];
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
        children: readonly ReactElement[];
    };
    readonly footer: ({ children }: IntrinsicElementProps, { renderChildren }: RenderContext) => {
        children: readonly ReactElement[];
    };
    readonly paragraph: ({ children, ...options }: IntrinsicElementProps, { renderChildren }: RenderContext) => any;
    readonly textrun: ({ children, ...options }: IntrinsicElementProps, { renderChildren }: RenderContext) => any;
    readonly table: (props: Record<string, never>) => Record<string, never>;
};
export declare const renderNode: (currentNode: ReactNode) => ReadonlyArray<IntrinsicElement>;
export declare const createRenderer: (rootType: 'document', parser: Parser) => (rootNode: ReactNode) => any;
