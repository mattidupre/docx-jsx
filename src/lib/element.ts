import { type ComponentFn } from './component';
import { type FragmentFn } from './fragment';
import { type Props as AnyProps } from '../utils/props';
import { type DocXClassName, DOCX_CLASS_NAMES } from './docXClasses';

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

export type ElementType = PrimitiveName | ComponentFn | FragmentFn;

export type Element<
  TProps extends Props = Props,
  TType extends PrimitiveName | ComponentFn<TProps> | FragmentFn<TProps> =
    | PrimitiveName
    | ComponentFn<TProps>
    | FragmentFn<TProps>,
> = {
  type: TType;
  props: TProps;
};

export const isElement = (value: any): value is Element =>
  !!(value?.type && 'props' in value);

export type PrimitiveElement<
  TProps extends Props = Props,
  TName extends PrimitiveName = PrimitiveName,
> = Element<TProps, TName>;

export const isPrimitiveElement = (value: any): value is PrimitiveElement =>
  isElement(value) && typeof value.type === 'string';

export type DocXPrimitiveElement<
  TProps extends Props = Props,
  TName extends PrimitiveName = PrimitiveName,
> = PrimitiveElement<TProps, TName>;

export const isDocXPrimitiveElement = (
  value: any,
): value is DocXPrimitiveElement =>
  isPrimitiveElement(value) && DOCX_CLASS_NAMES.includes(value.type as any);

export const definePrimitiveElement = <
  TName extends PrimitiveName,
  TProps extends Props,
>(
  name: TName,
  props: TProps,
) => ({ type: name, props }) as const;

export type FunctionElement<TProps extends Props = Props> = Element<
  TProps,
  ComponentFn<TProps> | FragmentFn<TProps>
>;

export const isFunctionElement = (value: any): value is FunctionElement =>
  isElement(value) && typeof value.type === 'function';

export const createElement = <
  P extends Readonly<Record<string, unknown>>,
  C extends ReadonlyArray<string | number | Node>,
  T extends PrimitiveName | ComponentFn | FragmentFn,
>(
  type: T,
  props: P,
  ...children: C
) => {
  return {
    type,
    props: {
      ...(props ?? {}),
      ...(children.length ? { children } : {}),
    },
  } as unknown as {
    type: T;
    props: (C extends [] ? unknown : { children: C }) & P;
  };
};
