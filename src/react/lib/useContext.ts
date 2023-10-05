import { Store } from 'src/render';
import { useIsReact } from './useIsReact';
import {
  useContext as useReactContext,
  type Context as ReactContext,
} from 'react';

export const useContext = <TValue>(context: ReactContext<TValue>): TValue => {
  if (useIsReact()) {
    const reactContext =
      Store.getGlobalValue<{ reactContext: ReactContext<TValue> }>(context)
        ?.value?.reactContext ?? context;
    return useReactContext(reactContext);
  }

  const nodeValue = Store.getLastNodeValue<{
    contextValue: any;
    ReactContext: ReactContext<any>;
  }>(context);
  if (nodeValue !== undefined) {
    return nodeValue.value.contextValue;
  }
  const globalValue = Store.getGlobalValue<{ defaultValue: any }>(context);
  if (globalValue !== undefined) {
    return globalValue.value.defaultValue;
  }
  throw new Error('Invalid context.');
};
