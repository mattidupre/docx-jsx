import { bindGlobalDispatcher, bindNodeDispatcher } from 'src/lib/dispatcher';
import { type ReactElement, type ReactNode } from 'react';
import { asArray, mapObjectEntries } from 'src/utils/utilities';
import {
  isDocXElement,
  isStringElement,
  asDocXInstance,
  isDocXInstance,
  type DocXInstance,
  type DocXClassName,
  type AsDocXElement,
} from '../entities';
import { renderReactNode } from './renderReactNode';

const expectDocXElement =
  <TName extends DocXClassName>(docXClassName: TName) =>
  (child: any): AsDocXElement<TName> => {
    if (!isDocXElement(child)) {
      throw new Error(`Child must be a ${docXClassName} Element.`);
    }
    return child as any;
  };

const renderDocXNode = bindNodeDispatcher(
  'docx',
  (node: ReactNode): ReadonlyArray<DocXInstance> =>
    renderReactNode(node, {
      parseChild: (child) => {
        if (isStringElement(child)) {
          return asDocXInstance('TextRun', { text: child.toString() });
        }

        if (isDocXElement(child)) {
          const {
            type,
            props: { children, ...props },
          } = child;

          const options = {
            ...props,
            ...(children
              ? {
                  children: children.flatMap((thisChild: ReactNode) =>
                    renderDocXNode(thisChild),
                  ),
                }
              : {}),
          };

          return asDocXInstance(type, options) as any;
        }

        // TODO: Why is this necessary?
        if (isDocXInstance(child)) {
          return child;
        }

        throw new Error('Unrecognized Element.');
      },
    }),
);

export const renderDocX = bindGlobalDispatcher(
  'docx',
  (rootNode: ReactElement) => {
    const documentElement = renderReactNode(rootNode, {
      expectSingle: true,
      parseChild: expectDocXElement('Document'),
    });

    const {
      props: { children: documentChildren, ...documentOptions },
    } = documentElement;

    if ('sections' in documentOptions) {
      throw new Error('Document must contain children, not sections.');
    }

    const sectionOptions = renderReactNode(documentChildren, {
      expectSingle: false,
      parseChild: expectDocXElement('Section'),
    }).flatMap((sectionElement) => {
      // TODO: Section Type https://docx.js.org/#/usage/sections?id=sections

      const {
        props: {
          children: childrenProp,
          header: headersProp,
          footer: footersProp,
          ...options
        },
      } = sectionElement;

      const children: ReadonlyArray<DocXInstance> = asArray(
        childrenProp,
      ).flatMap((thisChild: ReactNode) => renderDocXNode(thisChild));

      if (!children.length) {
        return [];
      }

      const header = mapObjectEntries(headersProp ?? {}, (key, value) => {
        const instance = renderReactNode(value, {
          expectSingle: true,
          parseChild: (child) => {
            expectDocXElement('Header')(child);
            return renderDocXNode(child);
          },
        });
        return instance ? [key, instance] : undefined;
      });

      const footer = mapObjectEntries(headersProp ?? {}, (key, value) => {
        const instance = renderReactNode(value, {
          expectSingle: true,
          parseChild: (child) => {
            expectDocXElement('Footer')(child);
            return renderDocXNode(child);
          },
        });
        return instance ? [key, instance] : undefined;
      });

      return { ...options, header, children, footer };
    });

    if (!sectionOptions.length) {
      throw new Error('Document must have at least one Section.');
    }

    return asDocXInstance('Document', {
      sections: sectionOptions,
      ...documentOptions,
    });
  },
);
