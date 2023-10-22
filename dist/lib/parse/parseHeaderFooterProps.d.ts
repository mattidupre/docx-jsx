import { type ElementProps } from 'src/entities';
export declare const parseHeaderFooterProps: <TRenderChild extends (value: any, types: ['header'] | ['footer']) => unknown>({ headers, footers }: Pick<ElementProps['section'], 'headers' | 'footers'>, renderChild: TRenderChild) => {
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
