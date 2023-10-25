import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicElementProps } from 'src/entities';

export function Content<TProps extends IntrinsicElementProps['content']>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement(
      'content' as any,
      options,
      ...Children.toArray(children),
    );
  }
  return children;
}
