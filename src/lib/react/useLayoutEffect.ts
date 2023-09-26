import { DispatcherStore } from '../dispatcher';
import { useLayoutEffect as useReactLayoutEffect } from 'react';
import { useReactHook } from './useReactHook';

export const useLayoutEffect = useReactHook(
  useReactLayoutEffect,
  (callback) => {
    // TODO: Verify calling order.
    DispatcherStore.addNodeCallback(callback);
  },
);
