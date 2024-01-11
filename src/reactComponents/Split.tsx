import type { ReactNode } from 'react';
import type { VariantName, TypographyOptions, TagName } from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';

export type SplitProps = ExtendableProps &
  TypographyOptions & {
    as?: TagName;
    variant?: VariantName;
    left: ReactNode;
    right: ReactNode;
  };

// TODO: If not within a <Document> or if target is web:
// do not encode data set CSS variables on element

export function Split({
  as = 'div',
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
        width: '100%',
        display: 'flex',
        columnGap: '0.0625rem',
        justifyContent: 'space-between',
      }}
      elementOptions={{}}
      typography={contentOptions}
    >
      <div>{left}</div>
      <div style={{ textAlign: 'right' }}>{right}</div>
    </InternalElement>
  );
}
