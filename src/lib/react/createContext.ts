import { useIsReact } from './useIsReact';
import { useContext } from './useContext';
import { asArray } from 'src/utils/utilities';
import { DispatcherStore } from '../dispatcher';
import {
  type Context as ReactContext,
  createElement,
  createContext as createReactContext,
} from 'react';

export const createContext = <TValue>(
  defaultValue: TValue,
): ReactContext<TValue> => {
  const Context = {} as ReactContext<TValue>;

  DispatcherStore.setGlobalValue(Context, { defaultValue });

  const {
    Provider: ReactProvider,
    Consumer: ReactConsumer,
    ...reactContext
  } = createReactContext<TValue>(defaultValue);

  return Object.assign(Context, reactContext, {
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
      DispatcherStore.setNodeValue(Context, { contextValue });
      return children;
    },

    Consumer({ children }: any) {
      if (useIsReact()) {
        return createElement(ReactConsumer, null, children);
      }
      const contextValue = useContext(Context);
      return createElement(
        ({ children: childrenFn }: any) => childrenFn(contextValue),
        null,
        children,
      );
    },
  });
};
