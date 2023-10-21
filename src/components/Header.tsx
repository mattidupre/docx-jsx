import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicProps } from 'src/entities';

export function Header<TProps extends IntrinsicProps['header']>({
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
