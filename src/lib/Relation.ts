import { Type, Kind, TypeRegistry, type TSchema } from '@sinclair/typebox';
import { type ReactNode } from 'react';
import { asArray } from 'src/utils';
import { Store } from 'src/lib/store';
import { type ElementType } from 'src/entities';

TypeRegistry.Set<any>('Node', () => true);

export type ElementRelation = (options: {
  type: ElementType | ReadonlyArray<ElementType>;
  single?: boolean;
  required?: boolean;
}) => TSchema;

export const Relation: ElementRelation = ({ type, required, single }) => {
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
      const renderer = Store.getRenderer();
      const parser = Store.getParser();

      const elements = parser(node).map((element) => {
        if (!typesArr.includes(element.type)) {
          throw new TypeError(
            `Expected child element "${
              element.type
            }" to be of type "${typesArr.join(' or ')}".`,
          );
        }
        return renderer(element);
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
