import { useIsReact } from './useIsReact';
import {
  useEffect as useReactEffect,
  type EffectCallback,
  type DependencyList,
} from 'react';
import { useOnRenderedCallback } from './renderWrapper';

export const useEffect = (callback: EffectCallback, deps: DependencyList) => {
  if (useIsReact()) {
    useReactEffect(callback, deps);
    return;
  }
  useOnRenderedCallback(callback);
};
