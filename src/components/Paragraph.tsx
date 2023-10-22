import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicElementProps } from 'src/entities';

export function Paragraph<TProps extends IntrinsicElementProps['paragraph']>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement(
      'paragraph' as any,
      options,
      ...Children.toArray(children),
    );
  }
  return children;
}
