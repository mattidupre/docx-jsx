import { createElement } from 'react';
import { useIsDocX } from 'src/react';
import { type IntrinsicElementProps } from 'src/entities';

export function Document<TProps extends IntrinsicElementProps['document']>({
  children,
  ...options
}: TProps) {
  if (useIsDocX()) {
    return createElement('document' as any, { ...options }, children);
  }
  return children;
}
