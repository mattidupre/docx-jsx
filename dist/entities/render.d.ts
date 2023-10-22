import { type ReactNode, type ReactElement } from 'react';
import { type IntrinsicType, type IntrinsicElementProps } from './element';
export type RenderType = 'docx' | 'ast' | 'html';
export type RenderContext = {
    type: string;
    renderChild: <TType extends IntrinsicType>(node: ReactNode, types: ReadonlyArray<TType>) => undefined | ReactElement;
    renderChildren: <TType extends IntrinsicType>(node: ReactNode, types: ReadonlyArray<TType>) => ReadonlyArray<ReactElement>;
};
export type Parser<TType extends IntrinsicType = IntrinsicType, TNode = ReactNode> = (options: IntrinsicElementProps<TNode>[TType], context: RenderContext) => unknown;
