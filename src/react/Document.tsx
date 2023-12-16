import { useMemo, type ReactNode } from 'react';
import { assignDocumentOptions } from '../entities';
import type { DocumentOptions } from '../entities';
import { ReactDocumentContext } from './entities';
import { useTarget } from './useTarget';
import { InternalElement } from './InternalElement';

export type DocumentProps = DocumentOptions & {
  children: ReactNode;
};

export function Document({
  children: childrenProp,
  ...documentOptions
}: DocumentProps) {
  const target = useTarget();

  const documentConfig = useMemo(
    () => assignDocumentOptions(documentOptions),
    [documentOptions],
  );

  const children = useMemo(
    (): ReactNode =>
      target === 'web' ? (
        childrenProp
      ) : (
        <InternalElement
          tagName="div"
          elementType="document"
          elementOptions={documentConfig}
        >
          {childrenProp}
        </InternalElement>
      ),
    [childrenProp, documentConfig, target],
  );

  return (
    <ReactDocumentContext.Provider value={documentConfig}>
      {children}
    </ReactDocumentContext.Provider>
  );
}
