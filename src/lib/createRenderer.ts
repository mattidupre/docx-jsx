import { type ReactNode } from 'react';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import {
  elementSchemas,
  ELEMENT_TYPES,
  type Parser,
  type Renderer,
} from 'src/entities';
import { Relation } from 'src/lib/Relation';
import { Value } from '@sinclair/typebox/value';
import { Store } from 'src/lib/store';

const propsParsers = Object.fromEntries(
  ELEMENT_TYPES.map((elementType) => {
    const encoder = TypeCompiler.Compile(elementSchemas[elementType]);
    return [elementType, (props: unknown) => encoder.Encode(props)];
  }),
);

type Options<TNode, TElement> = {
  renderer: Renderer<TElement>;
  parser: Parser<TNode>;
};

export const createRenderer = <TNode, TElement>({
  renderer,
  parser,
}: Options<TNode, TElement>) => {
  const rendererWithEncoder: Renderer = ({ type, props }) => {
    try {
      return renderer({ type, props: propsParsers[type](props) });
    } catch (err: any) {
      throw new TypeError(
        `Error parsing props for element "${type}": ${err.message}`,
      );
    }
  };

  return (rootNode: TNode): TElement => {
    if (Store.getIsRendering()) {
      throw new Error('Store is already rendering.');
    }

    try {
      Store.initGlobal({ renderer: rendererWithEncoder, parser });
      return Value.Encode(
        Relation({ type: 'document', required: true, single: true }),
        rootNode,
      );
    } finally {
      Store.completeGlobal();
    }
  };
};
