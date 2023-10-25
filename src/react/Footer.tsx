import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicElementProps } from 'src/entities';

export function Footer<TProps extends IntrinsicElementProps['footer']>({
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
