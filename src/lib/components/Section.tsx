import { createElement } from 'react';
import { asArray } from 'src/utils/utilities';
import { type AsDocXProps } from 'src/lib/docX';
import { useIsDocX } from 'src/lib/react/useIsDocX';

export function Section<TProps extends AsDocXProps<'Section'>>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('section' as any, options, ...asArray(children));
  }
  return children;
}
