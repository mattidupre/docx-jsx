import {
  renderNode,
  type RenderCallback,
  type RenderContext,
} from './renderNode';
import {
  type RenderEnvironment,
  type IntrinsicType,
  type IntrinsicElement,
  isIntrinsicElement,
} from '../entities';
import { type ReactNode } from 'react';
import { asArray, mapObjectValues } from 'src/utils';

const asSingle = <TValue, TNoEmpty extends boolean>(
  name: string,
  values: ReadonlyArray<TValue>,
  noEmpty?: boolean,
): TValue | (TNoEmpty extends true ? never : undefined) => {
  if (noEmpty && values.length === 0) {
    throw new Error(`Empty rendered ${name} values not allowed.`);
  }

  if (values.length > 1) {
    throw new Error(`Multiple rendered ${name} values not allowed.`);
  }

  return values[0] as any;
};

export const renderDocument: typeof renderNode = (
  environment,
  documentNode,
  contentCallback,
) => {
  // Don't try to new Document() here. That's only done for DocX. Just return object.
  return asSingle(
    'Document',
    renderNode(environment, documentNode, (context) => {
      const { element, parentElement, isRoot } = context;

      if (isRoot) {
        if (!isIntrinsicElement(element, 'document')) {
          throw new Error(
            'Only Document Elements may be rendered at the root.',
          );
        }

        const { children, ...props } = element.props;

        const sections = context.render(children);

        if (!sections.length) {
          throw new Error('No Sections found.');
        }

        return {
          sections,
          props,
        };
      }

      if (!isIntrinsicElement(parentElement)) {
        throw new Error(
          'Parent elements must be declared when not at the root.',
        );
      }

      if (isIntrinsicElement(element, 'document')) {
        throw new Error('Document Elements may only be rendered at the root.');
      }

      if (isIntrinsicElement(parentElement, 'document')) {
        if (!isIntrinsicElement(element, 'section')) {
          throw new Error(
            'Only Section Elements may be Documents Element children.',
          );
        }

        const {
          children: childrenProp = [],
          header: headersProp = {},
          footer: footersProp = {},
        } = element.props;

        const children = context.render(childrenProp);

        if (!children.length) {
          return [];
        }

        const mapObj = <TType extends IntrinsicType>(
          type: TType,
          prop: Record<string, IntrinsicElement<TType>>,
        ) =>
          mapObjectValues(prop, (key, value) => {
            const el = context.render(value);
            if (el.length === 0) {
              return undefined;
            }
            if (el.length > 1) {
              throw new Error(
                `Section prop ${type}:${key} may only render one Element.`,
              );
            }
            if (!isIntrinsicElement(el, type)) {
              throw new Error(
                `Section prop ${type}:${key} may only be a ${type} Element.`,
              );
            }
            return el[0];
          });

        return {
          children,
          header: mapObj('header', headersProp),
          footer: mapObj('footer', footersProp),
        };
      } else if (isIntrinsicElement(element, 'section')) {
        throw new Error(
          'Section Elements may only be rendered as Document Element children.',
        );
      }

      return contentCallback(context);
    }),
    true,
  );
};
