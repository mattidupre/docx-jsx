import { useMemo as useReactMemo } from 'react';
import { useReactHook } from './useReactHook';

export const useMemo: typeof useReactMemo = useReactHook(
  useReactMemo,
  (factory) => factory(),
);
