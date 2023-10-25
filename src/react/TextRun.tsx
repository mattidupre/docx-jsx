import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicElementProps } from 'src/entities';

export function TextRun<TProps extends IntrinsicElementProps['textrun']>({
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
