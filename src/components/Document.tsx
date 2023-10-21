import { createElement } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicProps } from 'src/entities';

export function Document<TProps extends IntrinsicProps['document']>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('document' as any, { ...options }, children);
  }
  return children;
}
