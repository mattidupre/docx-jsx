import { DispatcherStore } from '../dispatcher';
import { useEffect as useReactEffect } from 'react';
import { useReactHook } from './useReactHook';

export const useEffect = useReactHook(useReactEffect, (callback) => {
  // TODO: Verify calling order.
  DispatcherStore.addNodeCallback(callback);
});
