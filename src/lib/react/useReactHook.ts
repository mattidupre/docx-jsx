import { useIsReact } from './useIsReact';

export const useReactHook = <
  THook extends (...args: ReadonlyArray<any>) => any,
>(
  reactHook: THook,
  docXHook: THook,
): THook =>
  ((...args: ReadonlyArray<any>) => {
    if (useIsReact()) {
      return reactHook(...args);
    }
    return docXHook(...args);
  }) as any;
