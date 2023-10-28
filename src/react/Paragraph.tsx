import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type ElementProps } from 'src/entities';

export function Paragraph<TProps extends ElementProps['paragraph']>({
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
  return <p>{children}</p>;
}
