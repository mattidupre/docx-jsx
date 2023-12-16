import { useMemo, type ReactNode } from 'react';
import { createContext } from 'react';
import { encodeElementData, assignDocumentOptions } from '../entities';
import type {
  StackConfig,
  DocumentConfig,
  DocumentOptions,
} from '../entities/options.js';

type InternalContextValue = {
  document?: DocumentConfig;
  stack?: StackConfig;
};

const InternalContext = createContext<InternalContextValue>({});

export type DocumentProps = DocumentOptions & {
  className?: string; // TODO: Get rid of className and just use a fragment and react context.
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
