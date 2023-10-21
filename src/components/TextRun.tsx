import { createElement, Children } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicProps } from 'src/entities';

export function TextRun<TProps extends IntrinsicProps['textrun']>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement(
      'textrun' as any,
      options,
      ...Children.toArray(children),
    );
  }
  return <span>{children}</span>;
}
