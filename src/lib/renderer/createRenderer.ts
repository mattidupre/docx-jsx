import { Store } from 'src/lib/store';
import { type Parser } from 'src/lib/parse';
import { type ReactNode, type ReactElement, isValidElement } from 'react';
import { renderNode } from './renderNode';
import { renderProps, type OnChildrenProp } from './renderProps';
import { asArray } from 'src/utils';

const isElementOfTypes = (
  value: any,
  types: ReadonlyArray<string>,
): value is ReactElement<any, string> =>
  isValidElement(value) &&
  typeof value.type === 'string' &&
  types.includes(value.type);

export const createRenderer = (parser: Parser) => (rootNode: ReactNode) => {
  if (Store.getIsRendering()) {
    throw new Error('Store is already rendering.');
  }

  try {
    Store.initGlobal();

    const render: OnChildrenProp = (children, types) => {
      const typesArr: ReadonlyArray<string> = asArray(types);
      const elements = renderNode(children);

      elements.forEach((element) => {
        if (!isElementOfTypes(element, typesArr)) {
          throw new TypeError(
            `Invalid type "${
              (element as any)?.type ?? element
            }". Expected "${typesArr.join(' or ')}".`,
          );
        }
      });

      if (Array.isArray(types)) {
        return elements.map((element) => {
          return parser(element.type, renderProps(element, render));
        });
      }

      if (typeof types === 'string') {
        if (elements.length > 1) {
          throw new TypeError('Expected one or more elements.');
        }

        if (elements.length === 0) {
          return undefined;
        }

        return parser(elements[0].type, renderProps(elements[0], render));
      }

      throw new TypeError(`Invalid expected children type "${types}".`);
    };

    return render(rootNode, 'document');
  } finally {
    Store.completeGlobal();
  }
};
