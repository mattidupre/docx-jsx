import { useCallback as useReactCallback } from 'react';
import { useReactHook } from './useReactHook';
export const useCallback = useReactHook(useReactCallback, (callback) => callback);
//# sourceMappingURL=useCallback.js.map