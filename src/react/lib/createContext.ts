import { useIsReact } from './useIsReact';
import { useContext } from './useContext';
import { asArray } from 'src/utils/utilities';
import { Store } from '../../lib/render';
import {
  type Context as ReactContext,
  createElement,
  createContext as createReactContext,
} from 'react';

export const createContext = <TValue>(
  defaultValue: TValue,
): ReactContext<TValue> => {
  const reactContext = createReactContext<TValue>(defaultValue);

  const {
    Provider: ReactProvider,
    Consumer: ReactConsumer,
    ...contextRest
  } = reactContext;

  const customContext = {} as ReactContext<TValue>;

  Store.setGlobalValue(customContext, { defaultValue, reactContext });

  return Object.assign(customContext, contextRest, {
    Provider({ value: contextValue, children }: any) {
      if (useIsReact()) {
        return createElement(
          ReactProvider,
          {
            value: contextValue,
          },
          ...asArray<any>(children),
        );
      }
      Store.setNodeValue(customContext, { contextValue });
      return children;
    },

    Consumer({ children }: any) {
      if (useIsReact()) {
        return createElement(ReactConsumer, null, children);
      }
      const contextValue = useContext(customContext);
      return createElement(
        ({ children: childrenFn }: any) => childrenFn(contextValue),
        null,
        children,
      );
    },
  });
};
