import { DispatcherStore } from '../dispatcher';
import { useReactHook } from './useReactHook';
import { useContext as useReactContext } from 'react';

export const useContext = useReactHook(useReactContext, (context) => {
  const nodeValue = DispatcherStore.getLastNodeValue<{ contextValue: any }>(
    context,
  );
  if (nodeValue !== undefined) {
    return nodeValue.value.contextValue;
  }
  const globalValue = DispatcherStore.getGlobalValue<{ defaultValue: any }>(
    context,
  );
  if (globalValue !== undefined) {
    return globalValue.value.defaultValue;
  }
  throw new Error('Invalid context.');
});
