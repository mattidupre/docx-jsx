import { useIsReact } from './useIsReact';
import {
  useState as useReactState,
  type Dispatch,
  type SetStateAction,
} from 'react';

export const useMemo = <TState>(
  initialState: TState | (() => TState),
): [TState, Dispatch<SetStateAction<TState>>] => {
  if (useIsReact()) {
    return useReactState(initialState);
  }
  const value: TState =
    typeof initialState === 'function' ? (initialState as any)() : initialState;
  return [value, () => undefined];
};
