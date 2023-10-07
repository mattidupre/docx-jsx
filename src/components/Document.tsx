import { createElement } from 'react';
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
