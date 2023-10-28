import { useId as useReactId } from 'react';
import { useReactHook } from './useReactHook';
import { v4 as createId } from 'uuid';

export const useId = useReactHook(useReactId, () => createId());
