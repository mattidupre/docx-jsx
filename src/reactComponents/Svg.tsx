import type { SVGProps } from 'react';
import { InternalElement } from './InternalElement';

export function Svg({
  version = '1.1',
  xmlns = 'http://www.w3.org/2000/svg',
  className,
  style,
  children,
  ...props
}: SVGProps<never>) {
  return (
    <InternalElement
      tagName="svg"
      elementType="htmlraw"
      className={className}
      style={style}
      htmlAttributes={{
        version,
        xmlns,
        ...props,
      }}
    >
      {children}
    </InternalElement>
  );
}
