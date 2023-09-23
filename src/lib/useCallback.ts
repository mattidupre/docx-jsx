import { useIsReact } from './useIsReact';
import { useCallback as useReactCallback, type DependencyList } from 'react';

export const useCallback = <T extends Function>(
  callback: T,
  deps: DependencyList,
): T => (useIsReact() ? useReactCallback(callback, deps) : callback);
