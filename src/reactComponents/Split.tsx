import type { ReactNode } from 'react';
import type { VariantName, TypographyOptions } from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';

export type SplitProps = ExtendableProps &
  TypographyOptions & {
    as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    variant?: VariantName;
    left: ReactNode;
    right: ReactNode;
  };

// TODO: If not within a <Document> or if target is web:
// do not encode data set CSS variables on element

export function Split({
  as = 'p',
  variant,
  className,
  style,
  left,
  right,
  ...contentOptions
}: SplitProps) {
  return (
    <InternalElement
      disableInDocumentAssert
      tagName={as}
      elementType="split"
      variant={variant}
      className={className}
      style={{
        ...style,
        display: 'flex',
        columnGap: '0.0625rem',
        justifyContent: 'space-between',
      }}
      elementOptions={{}}
      typography={contentOptions}
    >
      <span>{left}</span>
      <span style={{ textAlign: 'right' }}>{right}</span>
    </InternalElement>
  );
}
