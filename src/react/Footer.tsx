import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type ElementProps } from 'src/entities';

export function Footer<TProps extends ElementProps['footer']>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement(
      'footer' as any,
      options,
      ...Children.toArray(children),
    );
  }
  return children;
}
