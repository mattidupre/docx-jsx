export declare const ELEMENT_RENDERERS: {
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
