import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicElementProps } from 'src/entities';

export function Header<TProps extends IntrinsicElementProps['header']>({
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
