import { useMemo, type ReactNode } from 'react';
import { encodeElementData, assignDocumentOptions } from '../entities';
import {
  type StackConfig,
  type DocumentConfig,
  type DocumentOptions,
  type StackOptions,
} from '../entities/options.js';
import { createContext } from 'react';

type InternalContextValue = {
  document?: DocumentConfig;
  stack?: StackConfig;
};

const InternalContext = createContext<InternalContextValue>({});

export type DocumentProps = DocumentOptions & {
  className?: string;
  children: ReactNode;
};

export function Document({
  children,
  className,
  ...documentOptions
}: DocumentProps) {
  const contextValue = useMemo(
    () => ({
      document: assignDocumentOptions(documentOptions),
    }),
    [documentOptions],
  );
  return (
    <InternalContext.Provider value={contextValue}>
      <main
        className={className}
        {...encodeElementData({
          elementType: 'document',
          elementOptions: contextValue.document,
        })}
      >
        {children}
      </main>
    </InternalContext.Provider>
  );
}
