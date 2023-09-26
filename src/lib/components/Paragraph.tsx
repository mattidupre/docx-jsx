import { createElement } from 'react';
import { asArray } from 'src/utils/utilities';
import { type AsDocXProps } from 'src/lib/docX';
import { useIsDocX } from 'src/lib/react/useIsDocX';

export function Paragraph<TProps extends AsDocXProps<'Paragraph'>>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('Paragraph' as any, options, asArray(children));
  }
  return children;
}
