import { createElement } from 'react';
import { asArray } from 'src/utils/utilities';
import { type AsDocXProps } from 'src/lib/docX';
import { useIsDocX } from 'src/lib/react/useIsDocX';

export function TextRun<TProps extends AsDocXProps<'TextRun'>>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('TextRun' as any, options, asArray(children));
  }
  return <span>{children}</span>;
}
