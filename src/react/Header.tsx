import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type ElementProps } from 'src/entities';

export function Header<TProps extends ElementProps['header']>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement(
      'header' as any,
      options,
      ...Children.toArray(children),
    );
  }
  return children;
}
