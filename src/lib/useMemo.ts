import { useIsReact } from './useIsReact';
import { useMemo as useReactMemo, type DependencyList } from 'react';

export const useMemo = <TValue>(
  factory: () => TValue,
  deps: DependencyList | undefined,
): TValue => (useIsReact() ? useReactMemo(factory, deps) : factory());
