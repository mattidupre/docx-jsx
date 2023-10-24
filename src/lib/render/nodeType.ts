import { Type, Kind, TypeRegistry } from '@sinclair/typebox';
import { renderNode } from './renderNode';
import { type ReactNode } from 'react';
import { asArray } from 'src/utils';

TypeRegistry.Set<any>('Node', () => true);

export const createNodeType =
  ({ parseElement }: { parseElement: (element) => unknown }) =>
  ({ type, required, single }) => {
    const typesArr = asArray(type);
    return Type.Transform(
      Type.Unsafe({
        [Kind]: 'Node',
      }),
    )
      .Decode((): ReactNode => {
        throw new Error('Decode not implemented.');
      })
      .Encode((node) => {
        const elements = renderNode(node).map((element) => {
          if (!typesArr.includes(element.type)) {
            throw new TypeError(
              `Expected child element "${
                element.type
              }" to be of type "${typesArr.join(' or ')}".`,
            );
          }
          return parseElement(element);
        });

        if (required && elements.length === 0) {
          throw new TypeError('At least one child element required.');
        }

        if (single) {
          if (elements.length > 1) {
            throw new TypeError('Received more than one child element.');
          }
          return elements[0];
        }

        return elements;
      }) as any;
  };
