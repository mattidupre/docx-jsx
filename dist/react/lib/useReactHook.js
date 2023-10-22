import { useIsReact } from './useIsReact';
export const useReactHook = (reactHook, docXHook) => ((...args) => {
    if (useIsReact()) {
        return reactHook(...args);
    }
    return docXHook(...args);
});
//# sourceMappingURL=useReactHook.js.map