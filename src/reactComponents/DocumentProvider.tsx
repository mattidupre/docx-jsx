import { useMemo, type ReactNode } from 'react';
import { assignDocumentOptions, type DocumentOptions } from '../entities';
import { createEnvironmentCss } from '../lib/toCss';
import { ReactDocumentContext } from './entities';
import { useEnvironment } from './useEnvironment';
import { InternalElement } from './InternalElement';
import { useInjectStyleSheets } from './useInjectStyleSheets';

export type DocumentProviderProps = DocumentOptions & {
  injectEnvironmentCss?: boolean;
  children: ReactNode;
};

export function DocumentProvider({
  injectEnvironmentCss,
  children,
  ...props
}: DocumentProviderProps) {
  const documentOptions = useMemo(
    () => assignDocumentOptions({}, props),
    [props],
  );
  const { variants, prefixes } = documentOptions;

  const { documentType } = useEnvironment({
    disableAssert: true,
  });

  const environmentStyleSheets = useMemo(
    () =>
      documentType === 'web' && injectEnvironmentCss
        ? [createEnvironmentCss({ prefixes, variants })]
        : [],
    [documentType, injectEnvironmentCss, prefixes, variants],
  );

  useInjectStyleSheets(environmentStyleSheets);

  return (
    <ReactDocumentContext.Provider value={documentOptions}>
      <InternalElement
        preferFragment
        tagName="div"
        elementType="document"
        elementOptions={documentOptions}
      >
        {children}
      </InternalElement>
    </ReactDocumentContext.Provider>
  );
}
