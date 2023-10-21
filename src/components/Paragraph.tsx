import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicProps } from 'src/entities';

export function Paragraph<TProps extends IntrinsicProps['paragraph']>({
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
