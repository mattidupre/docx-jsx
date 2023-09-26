import { DispatcherStore } from './DispatcherStore';

export const bindGlobalDispatcher = <
  TFn extends (...args: ReadonlyArray<any>) => any,
>(
  renderEnvironment: string,
  fn: TFn,
) =>
  ((...args: Parameters<TFn>) => {
    DispatcherStore.initGlobal(renderEnvironment);
    let result: any;
    try {
      result = fn(...args);
    } finally {
      DispatcherStore.completeGlobal();
    }
    return result;
  }) as TFn;
