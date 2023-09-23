import { useIsReact } from './useIsReact';
import { Fragment } from './fragment';
import { createElement, type Element } from './element';
import { useSetRenderState, usePrevRenderState } from './renderWrapper';
import {
  type Context as ReactContext,
  type ProviderProps as ReactProviderProps,
  type ConsumerProps as ReactConsumerProps,
  createElement as createReactElement,
  createContext as createReactContext,
  useContext as useReactContext,
} from 'react';

const DEFAULT_VALUE_KEY: unique symbol = Symbol('Context default value');

export type Context<TValue = any> = Omit<
  ReactContext<TValue>,
  'Provider' | 'Consumer'
> & {
  Provider: (props: ReactProviderProps<TValue>) => null | Element;
  Consumer: (props: ReactConsumerProps<TValue>) => null | Element;
  [DEFAULT_VALUE_KEY]: TValue;
};

export const useContext = <TValue>(context: Context<TValue>): TValue => {
  if (useIsReact()) {
    return useReactContext(context as any);
  }
  const renderState = usePrevRenderState<{ value: TValue }>(context);
  if (!renderState) {
    return context[DEFAULT_VALUE_KEY];
  }
  return renderState.value;
};

export const createContext = <TValue>(
  defaultValue: TValue,
): Context<TValue> => {
  const context = {} as Context<TValue>;

  const {
    Provider: ReactProvider,
    Consumer: ReactConsumer,
    ...reactContext
  } = createReactContext<TValue>(defaultValue);

  return Object.assign(context, reactContext, {
    [DEFAULT_VALUE_KEY]: defaultValue,

    Provider({ value, children }: ReactProviderProps<TValue>) {
      if (useIsReact()) {
        return createReactElement(ReactProvider, { value, children });
      }
      useSetRenderState(context, { value });
      return createElement(Fragment, { children });
    },

    Consumer({ children }: ReactConsumerProps<TValue>) {
      if (useIsReact()) {
        return createReactElement(ReactConsumer, { children });
      }
      return createElement(Fragment, {
        children: children(useContext(context)),
      });
    },
  });
};
