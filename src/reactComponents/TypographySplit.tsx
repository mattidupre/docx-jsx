import type { ReactNode } from 'react';
import type { VariantName, TypographyOptions } from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';

export type TypographySplitProps = ExtendableProps &
  TypographyOptions & {
    as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    variant?: VariantName;
    left: ReactNode;
    right: ReactNode;
  };

// TODO: If not within a <Document> or if target is web:
// do not encode data set CSS variables on element

export function TypographySplit({
  as = 'p',
  variant,
  className,
  style,
  left,
  right,
  ...contentOptions
}: TypographySplitProps) {
  return (
    <InternalElement
      disableInDocumentAssert
      tagName={as}
      elementType="typographysplit"
      variant={variant}
      className={className}
      style={{
        ...style,
        display: 'flex',
        flexWrap: 'wrap',
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
