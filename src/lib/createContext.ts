import { type Node, type Element } from './element';
import { FragmentComponent } from './fragment';
import { createElement } from './element';
import { useSetRenderState } from './renderWrapper';

type AnyContextValue = any;

type ContextProps<TValue extends AnyContextValue> = {
  value: TValue;
  children?: Node;
};

export type Context<TValue extends AnyContextValue = AnyContextValue> = {
  defaultValue: TValue;
  Provider: (props: ContextProps<TValue>) => null | Element;
};

export type ContextValue<TContext extends Context = Context<AnyContextValue>> =
  TContext['defaultValue'];

export const createContext = <TValue extends AnyContextValue>(
  defaultValue: TValue,
) => {
  const context: Context<TValue> = {
    defaultValue,
    Provider: ({ value, children }) => {
      useSetRenderState(context, { value });
      return createElement(FragmentComponent, { children });
    },
  };
  return context;
};
