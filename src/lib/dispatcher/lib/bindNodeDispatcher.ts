import { DispatcherStore } from './DispatcherStore';

export const bindNodeDispatcher = <
  TFn extends (...args: ReadonlyArray<any>) => any,
>(
  renderEnvironment: string,
  fn: TFn,
) =>
  ((...args: Parameters<TFn>) => {
    DispatcherStore.initNode(renderEnvironment);
    let result: any;
    try {
      result = fn(...args);
    } finally {
      DispatcherStore.completeNode();
    }
    return result;
  }) as TFn;
