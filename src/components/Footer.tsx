import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicProps } from 'src/entities';

export function Footer<TProps extends IntrinsicProps['footer']>({
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
