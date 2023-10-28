import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type ElementProps } from 'src/entities';

export function Content<TProps extends ElementProps['content']>({
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
