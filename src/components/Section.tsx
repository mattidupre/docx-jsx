import { createElement } from 'react';
import { asArray } from 'src/utils/utilities';
import { useIsDocX } from 'src/react';

export function Section<TProps extends AsDocXProps<'Section'>>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('section' as any, options, ...asArray(children));
  }
  return children;
}
