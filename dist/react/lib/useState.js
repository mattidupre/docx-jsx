import { useState as useReactState } from 'react';
import { useReactHook } from './useReactHook';
export const useState = useReactHook(useReactState, (initialState) => [
    typeof initialState === 'function' ? initialState() : initialState,
    () => undefined,
]);
//# sourceMappingURL=useState.js.map