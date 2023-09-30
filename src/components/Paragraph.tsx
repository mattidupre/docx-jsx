import { createElement } from 'react';
import { asArray } from 'src/utils/utilities';
import { useIsDocX } from 'src/react';

export function Paragraph<TProps extends AsDocXProps<'Paragraph'>>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('paragraph' as any, options, ...asArray(children));
  }
  return children;
}
