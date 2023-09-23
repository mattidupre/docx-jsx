import { createContext, useContext } from './context';
import { useMemo } from './useMemo';
import { createElement, type Node } from './element';

type DocumentConfig = { color: 'red' | 'blue' };

const DEFAULT_DOCUMENT_CONFIG = {
  color: 'red',
} as const satisfies DocumentConfig;

const DocumentContext = createContext<DocumentConfig>(DEFAULT_DOCUMENT_CONFIG);

type ProviderProps = {
  options?: Partial<DocumentConfig>;
  children: Node;
};

export const useDocumentContext = () => useContext(DocumentContext);

export const DocumentContextProvider = ({
  options = {},
  children,
}: ProviderProps) => {
  const config = useMemo(
    () => ({
      ...useDocumentContext(),
      ...options,
    }),
    [options],
  );
  return createElement(DocumentContext.Provider, { value: config, children });
};
