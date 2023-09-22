import { type Ignored, type Node, isIgnored, type Props } from './element';
import { type AsArray } from '../utils/array';

type FragmentProps = Props<{
  children?: Node;
}>;

export type FragmentFn<TProps extends FragmentProps = FragmentProps> = (
  props: FragmentProps,
) => TProps['children'] extends Ignored ? [] : AsArray<TProps['children']>;

export const FragmentComponent = <TProps extends FragmentProps>({
  children,
}: TProps): ReturnType<FragmentFn<TProps>> => {
  const result = (Array.isArray(children) ? children : []).filter((value) => {
    return !isIgnored(value);
  }) as any;

  return result;
};
