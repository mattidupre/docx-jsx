import { useIsReact } from './useIsReact';
import { useContext } from './useContext';
import { asArray } from 'src/utils/utilities';
import { Store } from 'src/lib/store';
import { createElement, createContext as createReactContext, } from 'react';
export const createContext = (defaultValue) => {
    const reactContext = createReactContext(defaultValue);
    const { Provider: ReactProvider, Consumer: ReactConsumer, ...contextRest } = reactContext;
    const customContext = {};
    Store.setGlobalValue(customContext, { defaultValue, reactContext });
    return Object.assign(customContext, contextRest, {
        Provider({ value: contextValue, children }) {
            if (useIsReact()) {
                return createElement(ReactProvider, {
                    value: contextValue,
                }, ...asArray(children));
            }
            Store.setNodeValue(customContext, { contextValue });
            return children;
        },
        Consumer({ children }) {
            if (useIsReact()) {
                return createElement(ReactConsumer, null, children);
            }
            const contextValue = useContext(customContext);
            return createElement(({ children: childrenFn }) => childrenFn(contextValue), null, children);
        },
    });
};
//# sourceMappingURL=createContext.js.map