import { type Simplify } from 'type-fest';
import {
  Type,
  Kind,
  type TSchema,
  type Static,
  TypeRegistry,
} from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { type ReactNode, type ReactElement } from 'react';

type Element<TElementType extends string = string> = ReactElement<
  object & { length?: never },
  TElementType
>;

type ElementType = string;

type ElementTypes<TType extends ElementType = ElementType> =
  ReadonlyArray<TType>;

const ELEMENT_SCHEMA_KEY = Symbol('Element schema key');

type ElementDefinition<
  TNodeType extends 'child' | 'children' = 'child' | 'children',
  TElementType extends ElementType = ElementType,
  TRequired extends undefined | boolean = undefined | boolean,
> = {
  nodeType: TNodeType;
  elementTypes: ElementTypes<TElementType>;
  required: TRequired;
};

type ElementSchema<TDefinition extends ElementDefinition = ElementDefinition> =
  TSchema & {
    [ELEMENT_SCHEMA_KEY]: TDefinition;
  };

type IsElementSchema<T> = typeof ELEMENT_SCHEMA_KEY extends keyof T
  ? true
  : false;

type InferElementSchema<TElementSchema extends ElementSchema> =
  TElementSchema[typeof ELEMENT_SCHEMA_KEY];

TypeRegistry.Set<ElementSchema>('Element', () => true);

type Encoder = ({
  node,
  elementDefinition,
}: {
  node: ReactNode;
  elementDefinition: ElementDefinition;
}) => any;

const Element =
  <TNodeType extends ElementDefinition['nodeType'], TEncoder extends Encoder>({
    nodeType,
    encoder,
  }: {
    nodeType: TNodeType;
    encoder: TEncoder;
  }) =>
  <
    TElementType extends ElementType,
    TRequired extends ElementDefinition['required'],
  >(
    elementTypes: ElementTypes<TElementType>,
    required?: TRequired,
  ) => {
    const elementDefinition = {
      nodeType,
      elementTypes,
      required,
    } as const satisfies ElementDefinition;

    return Type.Transform(
      Type.Unsafe({
        [Kind]: 'Element',
        [ELEMENT_SCHEMA_KEY]: elementDefinition,
      }),
    )
      .Decode((node): ReactNode => {
        throw new Error('Decode not implemented.');
      })
      .Encode((node) =>
        encoder({
          node: node as ReactNode,
          elementDefinition,
        }),
      ) as unknown as ElementSchema<
      ElementDefinition<TNodeType, TElementType, TRequired>
    >;
  };

const createSubschemas = <TEncoder extends Encoder>({
  encoder,
}: {
  encoder: TEncoder;
}) =>
  ({
    Child: Element({ nodeType: 'child', encoder }),
    Children: Element({ nodeType: 'children', encoder }),
  }) as const;

type Subschemas = ReturnType<typeof createSubschemas>;

type ElementHandler = (
  node: ReactNode,
  context: {
    elementDefinition: ElementDefinition;
    encodeElement: (element: Element) => any;
  },
) => any;

type ReplaceChildren<
  T,
  TChildDictionary extends Record<ElementType, any>,
  TChildrenDictionary extends Record<ElementType, any>,
> = IsElementSchema<T> extends true
  ? 'TODO'
  : T extends ReadonlyArray<infer I>
  ? ReplaceChildren<I, TChildDictionary, TChildrenDictionary>
  : T extends object
  ? {
      [K in keyof T]: ReplaceChildren<
        T[K],
        TChildDictionary,
        TChildrenDictionary
      >;
    }
  : T;

type Builder<TElementsSchema extends Record<ElementType, TSchema>> = <
  TChild extends Record<ElementType, any>,
  TChildren extends Record<ElementType, any>,
>(
  elementHandler: ElementHandler,
) => {
  temp?: {
    [K in keyof TElementsSchema]: ReplaceChildren<
      Static<TElementsSchema[K]>,
      Record<string, 'child'>,
      Record<string, 'children'>
    >;
  };
  (node: ReactNode, rootElementType: ElementType): any;
};

export const defineSchema =
  <TElementsSchema extends Record<ElementType, TSchema>>(
    buildSchemas: (subschemas: Subschemas) => TElementsSchema,
  ): Builder<TElementsSchema> =>
  (elementHandler) => {
    let encoders = {} as Record<
      ElementType,
      ReturnType<(typeof TypeCompiler)['Compile']>
    >;

    const encoder: Encoder = ({ node, elementDefinition }) =>
      elementHandler(node, {
        elementDefinition,
        encodeElement: ({ type, props }) => {
          console.log(`Encoding ${type}`);
          if (!encoders[type]) {
            throw new TypeError(`Unrecognized type "${type}".`);
          }
          try {
            return encoders[type].Encode(props);
          } catch (err: any) {
            throw new Error(
              `Error rendering element "${type}": ${err.message}`,
            );
          }
        },
      });

    const schemas = buildSchemas(
      createSubschemas({
        encoder,
      }),
    );

    for (const elementType in schemas) {
      encoders[elementType] = TypeCompiler.Compile(schemas[elementType]);
    }

    return (node, rootElementType) =>
      encoder({
        node,
        elementDefinition: {
          nodeType: 'child',
          elementTypes: [rootElementType],
          required: true,
        },
      });
  };
