import {
  type AnyProps,
  type PrimitiveName,
  type Component,
  type Fragment,
  type GetChildFromProps,
} from './entities';

export const createElement = <
  P extends AnyProps,
  T extends PrimitiveName | Component | Fragment,
>(
  type: T,
  props: Omit<P, 'children'>,
  ...children: ReadonlyArray<GetChildFromProps<P>>
) => {
  return {
    type,
    props: {
      ...(props ?? {}),
      ...{ children },
    },
  };
};
