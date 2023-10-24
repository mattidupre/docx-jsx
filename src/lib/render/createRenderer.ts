import { type ReactNode } from 'react';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { createElementSchemas } from 'src/entities';
import { Value } from '@sinclair/typebox/value';
import { createNodeType } from './nodeType';
import { Store } from 'src/lib/store';

export type Parser = (type: string, props: any) => any;

export const createRenderer = (parser: Parser) => {
  let encoders = {} as Record<
    string,
    ReturnType<(typeof TypeCompiler)['Compile']>
  >;

  const parseElement = ({ type, props }) => {
    if (!encoders[type]) {
      throw new TypeError(`Schema for type "${type}" not found.`);
    }

    try {
      const value = encoders[type].Encode(props);
      return parser(type, value);
    } catch (err: any) {
      throw new Error(
        `Error parsing props for element "${type}": ${err.message}`,
      );
    }
  };

  const ReactNode = createNodeType({ nodeType: 'child', parseElement });

  const schemaContext = { ReactNode };

  const schemas = createElementSchemas(schemaContext);

  for (const elementType in schemas) {
    encoders[elementType] = TypeCompiler.Compile(schemas[elementType]);
  }

  const Root = createNodeType({ nodeType: 'child', parseElement });

  return (rootNode: ReactNode) => {
    if (Store.getIsRendering()) {
      throw new Error('Store is already rendering.');
    }

    try {
      Store.initGlobal();
      const result = Value.Encode(
        ReactNode({ type: 'document', required: true, single: true }),
        rootNode,
      );
      return result;
    } finally {
      Store.completeGlobal();
    }
  };
};
