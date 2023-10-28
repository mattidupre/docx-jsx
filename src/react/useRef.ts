import { useRef as useReactRef } from 'react';
import { useReactHook } from './useReactHook';

export const useRef = useReactHook(
  useReactRef,
  (initialValue) =>
    ({
      current: initialValue,
    }) as any,
);
