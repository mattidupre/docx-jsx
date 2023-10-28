import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type ElementProps } from 'src/entities';

export function TextRun<TProps extends ElementProps['textrun']>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement(
      'textrun' as any,
      options,
      ...Children.toArray(children),
    );
  }
  return <span>{children}</span>;
}
