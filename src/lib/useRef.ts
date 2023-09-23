import { useIsReact } from './useIsReact';
import { useRef as useReactRef, type MutableRefObject } from 'react';

export const useRef = <TValue>(
  initialValue: TValue,
): MutableRefObject<TValue> =>
  useIsReact() ? useReactRef(initialValue) : { current: initialValue };
