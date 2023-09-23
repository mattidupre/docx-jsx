import { type AsArray } from '../utils/utilities';
import { type Props as AnyProps } from '../utils/props';
import { type DocXClassName, DOCX_CLASS_NAMES } from './docXClasses';
import { createElement as createReactElement, type ReactElement } from 'react';

const DOCX_ELEMENT_KEY: unique symbol = Symbol('docx');

export type Props<TProps extends Props = AnyProps> = TProps &
  Partial<Record<keyof InternalProps, never>>;

export type InternalProps = Record<never, any>;

export type AsInternalProps<TProps extends Props> = Omit<
  TProps,
  keyof InternalProps
> &
  InternalProps;

export type Node = number | string | Ignored | Element | ReadonlyArray<Node>;

export type Ignored = boolean | null | undefined;

export const isIgnored = (value: any): value is Ignored =>
  typeof value === 'boolean' || value === null || value === undefined;

export type PrimitiveName = DocXClassName;

export type ElementType<TProps extends Props = Props> =
  | PrimitiveName
  | { (props: TProps): null | Element | ReadonlyArray<Element> };

export type Element<
  TProps extends Props = Props,
  TType extends ElementType<TProps> = ElementType<TProps>,
> = ReactElement & {
  [DOCX_ELEMENT_KEY]: {
    type: TType;
    props: TProps;
  };
};

export type GetElementMeta<TElement extends Element> =
  TElement[typeof DOCX_ELEMENT_KEY];

export const getElementMeta = <TElement extends Element>(
  element: TElement,
): GetElementMeta<TElement> => element[DOCX_ELEMENT_KEY];

export type GetElementType<TElement extends Element> =
  GetElementMeta<TElement>['type'];

export const getElementType = <TElement extends Element>(
  element: TElement,
): GetElementType<TElement> => getElementMeta(element).type;

export type GetElementProps<TElement extends Element> =
  GetElementMeta<TElement>['props'];

export const getElementProps = <TElement extends Element>(
  element: TElement,
): GetElementProps<TElement> => getElementMeta(element).props;

export const isElement = (value: any): value is Element =>
  getElementMeta(value) !== undefined;

type ElementPropsFromChildren<
  P extends Props,
  C extends AsArray<Node>,
> = (C extends [] ? unknown : { children: C }) & P;

export const createElement = <
  P extends Props,
  C extends AsArray<Node>,
  T extends ElementType<ElementPropsFromChildren<P, C>>,
>(
  type: T,
  props: P,
  ...children: C
): Element<ElementPropsFromChildren<P, C>, T> => {
  // if (type && type.defaultProps) {
  //   const defaultProps = type.defaultProps;
  //   for (propName in defaultProps) {
  //     if (props[propName] === undefined) {
  //       props[propName] = defaultProps[propName];
  //     }
  //   }
  // }

  const combinedProps = {
    ...(props ?? {}),
    ...(children.length ? { children } : {}),
  };

  return {
    ...createReactElement(type as any, props, ...(children as any)),
    [DOCX_ELEMENT_KEY]: { type, props: combinedProps },
  } as any;
};

export type PrimitiveElement<
  TProps extends Props = Props,
  TName extends PrimitiveName = PrimitiveName,
> = Element<TProps, TName>;

export const isPrimitiveElement = (value: any): value is PrimitiveElement =>
  typeof getElementMeta(value)?.type === 'string';

export type DocXPrimitiveElement<
  TProps extends Props = Props,
  TName extends PrimitiveName = PrimitiveName,
> = PrimitiveElement<TProps, TName>;

export const isDocXPrimitiveElement = (
  value: any,
): value is DocXPrimitiveElement =>
  isPrimitiveElement(value) &&
  DOCX_CLASS_NAMES.includes(getElementMeta(value)?.type);

export type FunctionElement<TProps extends Props = Props> = Element<
  TProps,
  ElementType<TProps> & { (args: any): any }
>;

export const isFunctionElement = (value: any): value is FunctionElement =>
  isElement(value) && typeof getElementType(value) === 'function';
