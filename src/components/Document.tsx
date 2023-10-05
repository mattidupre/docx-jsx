import { createElement } from 'react';
import { asArray } from 'src/utils/utilities';
import { useIsDocX } from 'src/react';

export function Document<TProps extends AsDocXProps<'Document'>>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('document' as any, { ...options, sections: children });
  }
  return children;
}
