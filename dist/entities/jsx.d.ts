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
export type Nullish = true | false | null | undefined;
export declare const isNullish: (value: any) => value is Nullish;
export type Stringish = string | number;
export declare const isStringish: (value: any) => value is Stringish;
export type IntrinsicElement<TType extends IntrinsicType = IntrinsicType, TProps extends IntrinsicElementProps = IntrinsicElementProps> = TType extends unknown ? ReactElement<TProps, TType> : never;
export declare const isIntrinsicElement: <TType extends IntrinsicType>(value: any, allowTypes?: readonly TType[] | undefined) => value is IntrinsicElement<TType, IntrinsicElementProps<ReactNode>>;
