import {
  DOCX_CLASS_NAMES,
  type DocXClassName,
  type AsDocXClassName,
  type DocXOptions,
  type DocXInstance,
} from './docXClasses';

// Primitive Names

export type PrimitiveName = DocXClassName;

/**
 * A PrimitiveName configuration indicating if a Node may also be an array.
 */
export type PN = PrimitiveName | ReadonlyArray<PrimitiveName>;

export type GetPrimitiveNameFromElement<T extends AnyElement> = T extends {
  type: infer N extends PrimitiveName;
}
  ? N
  : T extends { type: (...args: any) => infer R }
  ? R extends ReadonlyArray<infer I extends AnyElement>
    ? GetPrimitiveNameFromElement<I>
    : R extends AnyElement
    ? GetPrimitiveNameFromElement<R>
    : never
  : never;

export type GetPN<T extends AnyElement> =
  | GetPrimitiveNameFromElement<T>
  | T extends { type: (...args: any) => ReadonlyArray<AnyElement> }
  ? ReadonlyArray<GetPrimitiveNameFromElement<T>>
  : never;

export type IsPNMultiple<N extends PN> = N extends ReadonlyArray<PrimitiveName>
  ? true
  : false;

export type AsPrimitiveName<N extends PN> = N extends PrimitiveName
  ? N
  : N extends ReadonlyArray<infer I extends PrimitiveName>
  ? I
  : never;

// Props

export type PrimitiveProps<N extends PN = PN> = GetPrimitiveProps<
  DocXOptions<AsPrimitiveName<N>>
>;

export type ComponentProps<
  P extends undefined | AnyProps = undefined | AnyProps,
> = P;

export type FragmentProps<N extends PN = PN> = IsPNMultiple<N> extends true
  ? {
      children?: Array<Node<N>>;
    }
  : never;

export type AnyProps = Record<string, any>;

export type GetChildFromProps<T extends AnyProps> = T extends { children?: any }
  ? Extract<T['children'], Array<any> | ReadonlyArray<any>> extends
      | Array<infer I>
      | ReadonlyArray<infer I>
    ? I
    : never
  : never;

// Components

export type PrimitiveComponent<N extends PN = PN> = (
  props: PrimitiveProps<N>,
) => PrimitiveElement<N>;

export type Component<
  P extends ComponentProps = ComponentProps,
  N extends PN = PN,
> = (props: P) => null | Child<N>;

export type Fragment<N extends PN = PN> = IsPNMultiple<N> extends true
  ? (props: FragmentProps<N>) => ReadonlyArray<Ignored | Child<N>>
  : never;

// Elements

export type PrimitiveElement<N extends PN = PN> = {
  type: AsPrimitiveName<N>;
  props: PrimitiveProps<N>;
};

export type ComponentElement<
  P extends ComponentProps = ComponentProps,
  N extends PN = PN,
> = { type: Component<P, N>; props: ComponentProps<P> };

export type FragmentElement<N extends PN = PN> = N extends ReadonlyArray<any>
  ? {
      type: Fragment<N>;
      props: FragmentProps<N>;
    }
  : never;

export type FunctionElement<
  N extends PN = PN,
  P extends ComponentProps = ComponentProps,
> = ComponentElement<P, N> | FragmentElement<N>;

export type AnyElement = PrimitiveElement | FunctionElement;

// Returned Values

export type Ignored = boolean | null | undefined;

export type Child<N extends PN> = N extends ReadonlyArray<
  infer I extends PrimitiveName
>
  ? Child<I> & ReadonlyArray<Child<I>>
  :
      | (GetChildFromProps<PrimitiveProps<N>> extends string ? string : never)
      | PrimitiveElement<N>
      | ComponentElement<ComponentProps, N>
      | FragmentElement<N>;

export type Node<N extends PN = PN> = Ignored | Child<N>;

// Type Guards

export const isElement = (value: any): value is ComponentElement =>
  !!(value?.type && 'props' in value);

export const isPrimitiveElement = (value: any): value is PrimitiveElement =>
  isElement(value) && DOCX_CLASS_NAMES.includes(value.type as any);

export const isFunctionElement = (value: any): value is FunctionElement =>
  isElement(value) && typeof value.type === 'function';

export const isIgnored = (value: any): value is Ignored =>
  typeof value === 'boolean' || value === null || value === undefined;

// Helpers

type GetPrimitiveProps<T extends DocXOptions> = {
  [N in keyof T]: N extends 'children'
    ?
        | Extract<GetChildFromProps<T>, string>
        | Extract<GetChildFromProps<T>, number>
        | ReadonlyArray<
            GetChildFromProps<T> extends DocXInstance
              ? Child<[AsDocXClassName<GetChildFromProps<T>>]>
              : GetChildFromProps<T>
          >
    : GetPrimitivePropsDeep<T[N]>;
};

type GetPrimitivePropsDeep<T> = NonNullable<T> extends Record<string, any>
  ? {
      [O in keyof T]: GetPrimitivePropsDeep<T[O]>;
    }
  : NonNullable<T> extends Array<infer I>
  ? Array<GetPrimitivePropsDeep<I>>
  : NonNullable<T> extends ReadonlyArray<infer I>
  ? ReadonlyArray<GetPrimitivePropsDeep<I>>
  : NonNullable<T> extends DocXInstance
  ? Child<AsDocXClassName<NonNullable<T>>>
  : T;
