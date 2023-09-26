import { useState as useReactState } from 'react';
import { useReactHook } from './useReactHook';

export const useState = useReactHook(
  useReactState,
  (initialState: any) =>
    [
      typeof initialState === 'function' ? initialState() : initialState,
      () => undefined,
    ] as any,
);
