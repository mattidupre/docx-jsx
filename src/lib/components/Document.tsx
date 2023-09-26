import { createElement } from 'react';
import { asArray } from 'src/utils/utilities';
import { type AsDocXProps } from 'src/lib/docX';
import { useIsDocX } from 'src/lib/react/useIsDocX';

export function Document<TProps extends AsDocXProps<'Document'>>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('Document' as any, options, asArray(children));
  }
  return children;
}
