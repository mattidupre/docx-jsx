import { useMemo, type ReactNode } from 'react';
import { assignDocumentOptions, type DocumentOptions } from '../entities';
import { createEnvironmentCss } from '../lib/toCss';
import { ReactDocumentContext } from './entities.js';
import { useEnvironment } from './useEnvironment.js';
import { InternalElement } from './InternalElement.js';
import { useInjectStyleSheets } from './useInjectStyleSheets';

export type DocumentProviderProps = DocumentOptions & {
  injectEnvironmentCss?: boolean;
  children: ReactNode;
};

export function DocumentProvider({
  injectEnvironmentCss,
  children: childrenProp,
  ...props
}: DocumentProviderProps) {
  const documentOptions = useMemo(() => assignDocumentOptions(props), [props]);
  const { variants, prefixes } = documentOptions;

  const { documentType, isWebPreview } = useEnvironment({
    disableAssert: true,
  });

  const environmentStyleSheets = useMemo(
    () =>
      documentType === 'web' && (injectEnvironmentCss || isWebPreview)
        ? [createEnvironmentCss({ prefixes, variants })]
        : [],
    [documentType, injectEnvironmentCss, isWebPreview, prefixes, variants],
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
        {childrenProp}
      </InternalElement>
    </ReactDocumentContext.Provider>
  );
}
