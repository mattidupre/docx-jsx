import { Store } from 'src/lib/store';
import { useIsReact } from './useIsReact';
import { useContext as useReactContext, } from 'react';
export const useContext = (context) => {
    if (useIsReact()) {
        const reactContext = Store.getGlobalValue(context)
            ?.value?.reactContext ?? context;
        return useReactContext(reactContext);
    }
    const nodeValue = Store.getLastNodeValue(context);
    if (nodeValue !== undefined) {
        return nodeValue.value.contextValue;
    }
    const globalValue = Store.getGlobalValue(context);
    if (globalValue !== undefined) {
        return globalValue.value.defaultValue;
    }
    throw new Error('Invalid context.');
};
//# sourceMappingURL=useContext.js.map