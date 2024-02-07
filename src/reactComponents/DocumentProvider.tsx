import { useMemo, type ReactNode, useContext } from 'react';
import { omit } from 'lodash';
import { assignDocumentOptions, type DocumentOptions } from '../entities';
import { ReactDocumentContext, ReactContentContext } from './entities';
import { InternalElement } from './InternalElement';
import { ContentProvider } from './ContentProvider';

export type DocumentProviderProps = DocumentOptions & {
  children: ReactNode;
};

export function DocumentProvider({
  variants,
  prefixes,
  children,
}: DocumentProviderProps) {
  const prevDocumentOptions = (useContext(ReactContentContext) ??
    {}) satisfies DocumentOptions;

  const documentOptions = useMemo(
    () =>
      assignDocumentOptions({}, { variants, prefixes }, prevDocumentOptions),
    [variants, prefixes, prevDocumentOptions],
  );

  const documentContextValue = useMemo(
    () => omit(documentOptions, ['variants', 'prefixes']),
    [documentOptions],
  );

  return (
    <ContentProvider {...documentOptions}>
      <ReactDocumentContext.Provider value={documentContextValue}>
        <InternalElement
          preferFragment
          tagName="div"
          elementType="document"
          elementOptions={documentOptions}
        >
          {children}
        </InternalElement>
      </ReactDocumentContext.Provider>
    </ContentProvider>
  );
}
