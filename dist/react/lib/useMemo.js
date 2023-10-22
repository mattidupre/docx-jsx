import { useMemo as useReactMemo } from 'react';
import { useReactHook } from './useReactHook';
export const useMemo = useReactHook(useReactMemo, (factory) => factory());
//# sourceMappingURL=useMemo.js.map