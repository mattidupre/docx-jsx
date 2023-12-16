import { useMemo, type ReactNode } from 'react';
import { encodeElementData, assignDocumentOptions } from '../entities';
import type { DocumentOptions } from '../entities';
import { ReactDocumentContext } from './entities';

// TODO: If target is web, use a fragment.

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
    () => assignDocumentOptions(documentOptions),
    [documentOptions],
  );
  return (
    <ReactDocumentContext.Provider value={contextValue}>
      <main
        className={className}
        {...encodeElementData({
          elementType: 'document',
          elementOptions: contextValue,
        })}
      >
        {children}
      </main>
    </ReactDocumentContext.Provider>
  );
}
