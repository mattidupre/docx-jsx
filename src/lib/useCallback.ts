export const useCallback = <
  TCallback extends (...args: ReadonlyArray<unknown>) => unknown,
>(
  callback: TCallback,
) => callback;
