import { type TSchema } from '@sinclair/typebox';
import { type ReactNode, type ReactElement } from 'react';
type Element<TElementType extends string = string> = ReactElement<object & {
    length?: never;
}, TElementType>;
type ElementType = string;
type ElementTypes<TType extends ElementType = ElementType> = ReadonlyArray<TType>;
declare const ELEMENT_SCHEMA_KEY: unique symbol;
type ElementDefinition<TNodeType extends 'child' | 'children' = 'child' | 'children', TElementType extends ElementType = ElementType, TRequired extends undefined | boolean = undefined | boolean> = {
    nodeType: TNodeType;
    elementTypes: ElementTypes<TElementType>;
    required: TRequired;
};
type ElementSchema<TDefinition extends ElementDefinition = ElementDefinition> = TSchema & {
    [ELEMENT_SCHEMA_KEY]: TDefinition;
};
type ElementsSchema = Record<string, TSchema>;
type Decoder = ({ node, elementDefinition, }: {
    node: ReactNode;
    elementDefinition: ElementDefinition;
}) => any;
declare const Element: <TNodeType extends "child" | "children", TDecoder extends Decoder>({ nodeType, decoder, }: {
    nodeType: TNodeType;
    decoder: TDecoder;
}) => <TElementType extends string, TRequired extends boolean | undefined>(elementTypes: ElementTypes<TElementType>, required?: TRequired | undefined) => ElementSchema<ElementDefinition<TNodeType, TElementType, TRequired>>;
declare const createSubschemas: <TElementsSchema extends ElementsSchema, TDecoder extends Decoder>(options: {
    elementsSchema: TElementsSchema;
    decoder: TDecoder;
}) => {
    readonly Child: <TElementType extends string, TRequired extends boolean | undefined>(elementTypes: ElementTypes<TElementType>, required?: TRequired | undefined) => ElementSchema<ElementDefinition<"child", TElementType, TRequired>>;
    readonly Children: <TElementType_1 extends string, TRequired_1 extends boolean | undefined>(elementTypes: ElementTypes<TElementType_1>, required?: TRequired_1 | undefined) => ElementSchema<ElementDefinition<"children", TElementType_1, TRequired_1>>;
};
type Subschemas = ReturnType<typeof createSubschemas>;
type ElementHandler = (node: ReactNode, context: {
    elementDefinition: ElementDefinition;
    decodeElement: (element: Element) => any;
}) => any;
export declare const defineSchema: <TElementsSchema extends Record<string, TSchema>>(callback: (subschemas: Subschemas) => TElementsSchema) => <TElementHandler extends ElementHandler>(elementHandler: TElementHandler) => (node: ReactNode, rootElementType: ElementType) => any;
export {};
