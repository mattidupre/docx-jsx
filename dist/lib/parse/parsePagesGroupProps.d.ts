/// <reference types="react" />
import { type ElementProps, type RenderContext } from 'src/entities';
export declare const parsePagesGroupProps: ({ children, headers, footers }: ElementProps['section'], { renderChild, renderChildren }: RenderContext) => {
    children: readonly import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>[];
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
