import { useMemo, type ReactNode, useContext } from 'react';
import { omit } from 'lodash';
import { assignDocumentOptions, type DocumentOptions } from '../entities';
import { ReactDocumentContext, ReactContentContext } from './entities';
import { InternalElement } from './InternalElement';
import { ContentProvider } from './ContentProvider';

export type DocumentProviderProps = DocumentOptions & {
  injectEnvironmentCss?: boolean;
  children: ReactNode;
};

export function DocumentProvider({
  injectEnvironmentCss,
  size,
  variants,
  prefixes,
  fonts,
  defaultTypography,
  fragmentation,
  children,
}: DocumentProviderProps) {
  const prevDocumentOptions = (useContext(ReactContentContext) ??
    {}) satisfies DocumentOptions;

  const documentOptions = useMemo(
    () =>
      assignDocumentOptions(
        {},
        { size, variants, prefixes, fonts, defaultTypography, fragmentation },
        prevDocumentOptions,
      ),
    [
      size,
      variants,
      prefixes,
      fonts,
      defaultTypography,
      fragmentation,
      prevDocumentOptions,
    ],
  );

  const documentContextValue = useMemo(
    () => omit(documentOptions, ['variants', 'prefixes']),
    [documentOptions],
  );

  return (
    <ContentProvider
      injectEnvironmentCss={injectEnvironmentCss}
      {...documentOptions}
    >
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
