import { type ElementType, type ParserOptions } from 'src/entities';
export type Parser = <TElementType extends ElementType>(inputType: TElementType, props: ParserOptions[TElementType]) => any;
export declare const defineParser: <TCallbacks extends {
    [x: string]: (props: ParserOptions) => any;
}>(callbacks: TCallbacks) => <TElementType extends ElementType>(inputType: TElementType, props: ParserOptions) => any;
