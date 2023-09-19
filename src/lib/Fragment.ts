import { type FragmentProps, type Child, isIgnored } from './entities';

export const Fragment = <P extends FragmentProps>({
  children,
}: P): P extends FragmentProps<infer N> ? ReadonlyArray<Child<N>> : never => {
  const result = (Array.isArray(children) ? children : []).filter((value) => {
    return !isIgnored(value);
  }) as any;

  return result;
};
