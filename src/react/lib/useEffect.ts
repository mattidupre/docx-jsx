import { Store } from 'src/lib/render';
import { useEffect as useReactEffect } from 'react';
import { useReactHook } from './useReactHook';

export const useEffect = useReactHook(useReactEffect, (callback) => {
  // TODO: Verify calling order.
  Store.addNodeCallback(callback);
});
