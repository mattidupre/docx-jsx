import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicElementProps } from 'src/entities';

export function PagesGroup<TProps extends IntrinsicElementProps['section']>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement(
      'section' as any,
      options,
      ...Children.toArray(children),
    );
  }
  return children;
}
