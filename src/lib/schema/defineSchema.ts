import { type ReactNode } from 'react';
import { type TSchema } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { NodeType, type Encoder, type NodeTypeOptions } from './nodeType';

export type ElementHandler = (
  node: ReactNode,
  context: {
    elementDefinition: NodeTypeOptions;
    encodeElement: (element: { type: string; props: any }) => any;
  },
) => any;

type Schema = <
  TChild extends Record<string, any>,
  TChildren extends Record<string, any>,
>(
  elementHandler: ElementHandler,
) => (node: ReactNode, rootElementType: string) => unknown;

const createSchemaContext = ({ encoder }: { encoder: Encoder }) =>
  ({
    Child: NodeType({ nodeType: 'child', encoder }),
    Children: NodeType({ nodeType: 'children', encoder }),
  }) as const;

type SchemaContext = ReturnType<typeof createSchemaContext>;

export const defineSchema =
  <TElementsSchema extends Record<string, TSchema>>(
    buildSchemas: (subschemas: SchemaContext) => TElementsSchema,
  ): Schema =>
  (elementHandler) => {
    let encoders = {} as Record<
      string,
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
            console.log({ ...err });
            throw new Error(`Error rendering node "${type}": ${err.message}`);
          }
        },
      });

    const context = createSchemaContext({ encoder });

    const schemas = buildSchemas(context);

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
