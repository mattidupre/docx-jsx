import { type ReactNode, createContext, useContext } from 'react';
import type {
  TextOptions,
  ParagraphOptions,
  DocumentOptions,
  StackOptions,
  ElementType,
} from '../entities';

type ContextValue = {
  text: TextOptions;
  paragraph: ParagraphOptions;
  document: DocumentOptions;
  stack: StackOptions;
};

const ReactContext = createContext<ContextValue>({
  text: {},
  paragraph: {},
  document: {},
  stack: {},
});

export const useReactContext = () => useContext(ReactContext);

type ContextProps = ContextValue & {
  elementType: ElementType;
  children: ReactNode;
};

export function Context({ children, ...options }: ContextProps) {
  return (
    <ReactContext.Provider value={options}>{children}</ReactContext.Provider>
  );
}
