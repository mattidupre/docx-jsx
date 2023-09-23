import {
  parseOverArray,
  asArray,
  type GetRequiredKeys,
  type ParseOverArray,
  type Flat,
} from './utilities';

export type Props = Record<string, unknown>;

export const isProps = (value: any): value is Props =>
  typeof value === 'object' && value !== null;

export type HasChildren<T extends Props> = 'children' extends keyof T
  ? T['children'] extends undefined
    ? false
    : true
  : false;

export type HasRequiredChildren<T extends Props> = HasChildren<T> extends true
  ? 'children' extends GetRequiredKeys<T>
    ? true
    : false
  : false;

export type HasPartialChildren<T extends Props> = HasChildren<T> extends true
  ? HasRequiredChildren<T> extends false
    ? true
    : false
  : false;

export const hasChildren = (value: any): value is { children: unknown } =>
  'children' in value;

export type GetChildren<T extends Props> = HasChildren<T> extends true
  ? T['children']
  : undefined;

export type GetChild<T extends Props> = HasPartialChildren<T> extends true
  ? Flat<Exclude<T['children'], undefined>>
  : HasRequiredChildren<T> extends true
  ? Flat<T['children']>
  : never;

export type OmitChildren<T extends Props> = HasChildren<T> extends true
  ? Omit<T, 'children'>
  : T;

export type PickChildren<T extends Props> = HasChildren<T> extends true
  ? Pick<T, 'children'>
  : Record<never, any>;

type ExcludeChildFromChildren<TChildren, TChild> = TChildren extends unknown
  ? TChildren extends ReadonlyArray<infer I>
    ? ReadonlyArray<Exclude<I, TChild>>
    : Exclude<TChildren, TChild>
  : never;

export type ExcludeChild<
  TProps extends Props,
  TChild extends unknown,
> = HasChildren<TProps> extends true
  ? OverwriteChildren<
      TProps,
      ExcludeChildFromChildren<TProps['children'], TChild>
    >
  : TProps;

type IncludeChildFromChildren<TChildren, TChild> = TChildren extends unknown
  ? TChildren extends ReadonlyArray<infer I>
    ? ReadonlyArray<I | TChild>
    : TChildren | TChild
  : never;

export type IncludeChild<
  TProps extends Props,
  TChild extends unknown,
> = HasChildren<TProps> extends true
  ? OverwriteChildren<
      TProps,
      IncludeChildFromChildren<TProps['children'], TChild>
    >
  : TProps;

export type OverwriteChildren<
  TProps extends Props,
  TChildren extends unknown,
> = HasPartialChildren<TProps> extends true
  ? Omit<TProps, 'children'> & { children?: TChildren }
  : HasRequiredChildren<TProps> extends true
  ? Omit<TProps, 'children'> & { children: TChildren }
  : TProps;

export const overwriteChildren = <TProps extends Props>(
  props: TProps,
  callback: (value: GetChildren<TProps>) => unknown,
) =>
  ({
    ...props,
    children: callback(props.children as any),
  }) as OverwriteChildren<TProps, ReadonlyArray<unknown>>;

export type AsChildrenArray<TProps extends Props> = OverwriteChildren<
  TProps,
  ReadonlyArray<GetChild<TProps>>
>;

export const asChildrenArray = <TProps extends Props>(
  props: TProps,
): AsChildrenArray<TProps> => {
  if (!hasChildren(props)) {
    return props as any;
  }

  return overwriteChildren(props, asArray) as any;
};

export const parseOverChildren = <TProps extends Props, TReturn>(
  props: TProps,
  callback: ParseOverArray<GetChildren<TProps>, TReturn>,
): OverwriteChildren<TProps, ReadonlyArray<TReturn>> => {
  if (!hasChildren(props)) {
    return props as any;
  }

  return overwriteChildren(props, (children) =>
    parseOverArray(children as any, callback as any),
  ) as any;
};
