import { createElement } from 'react';
import { asArray } from 'src/utils/utilities';
import { useIsDocX } from 'src/react';

export function TextRun<TProps extends AsDocXProps<'TextRun'>>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('textrun' as any, options, ...asArray(children));
  }
  return <span>{children}</span>;
}
