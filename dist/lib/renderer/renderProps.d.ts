import { type ReactElement, type ReactNode } from 'react';
export type OnChildrenProp = (children: ReactNode, types: string | ReadonlyArray<string>) => unknown;
export declare const renderProps: (element: ReactElement<any, string>, onChildren: OnChildrenProp) => any;
