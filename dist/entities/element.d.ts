import { type ReactNode, type ReactElement } from 'react';
import { type ISectionOptions, type IDocumentOptions, type IParagraphOptions, type IRunOptions } from 'docx';
export type IntrinsicType = 'document' | 'section' | 'header' | 'footer' | 'paragraph' | 'textrun' | 'table';
export type IntrinsicElementProps<TNode = ReactNode> = {
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
export type IntrinsicElement<TType extends IntrinsicType = IntrinsicType, TProps extends IntrinsicElementProps = IntrinsicElementProps> = TType extends unknown ? ReactElement<TProps, TType> : never;
export declare const isAnyElement: (value: any) => value is ReactElement<any, string | import("react").JSXElementConstructor<any>>;
export declare const isIntrinsicElement: <TType extends IntrinsicType = IntrinsicType>(value: any, allowTypes?: readonly TType[] | undefined) => value is IntrinsicElement<TType, IntrinsicElementProps<ReactNode>>;
export declare function assertIntrinsicElement<TType extends IntrinsicType = IntrinsicType>(value: unknown, allowTypes?: ReadonlyArray<TType>): asserts value is IntrinsicElement<TType>;
export declare const asIntrinsicElement: <TType extends IntrinsicType = IntrinsicType>(value: unknown, allowTypes?: readonly TType[] | undefined) => IntrinsicElement<TType, IntrinsicElementProps<ReactNode>>;
export declare const isComponentElement: (value: any) => value is ReactElement<any, (...args: any) => any>;
