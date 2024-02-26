import type { HTMLAttributes, ReactNode } from 'react';
import { InternalElement } from './InternalElement';

export type RawProps<TTagName extends keyof JSX.IntrinsicElements> =
  HTMLAttributes<TTagName> & {
    as: keyof JSX.IntrinsicElements;
    children: ReactNode;
  };

export function Raw<TTagName extends keyof JSX.IntrinsicElements>({
  children,
  className,
  style,
  ...props
}: RawProps<TTagName>) {
  return (
    <InternalElement
      tagName="div"
      elementType="htmlraw"
      className={className}
      style={style}
      htmlAttributes={props}
    >
      {children}
    </InternalElement>
  );
}
