import type { ReactNode } from 'react';
import type { TagName, VariantName, TypographyOptions } from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';

export type TypographyProps = ExtendableProps &
  TypographyOptions & {
    as?: TagName;
    variant?: VariantName;
    children?: ReactNode;
  };

// TODO: If not within a <Document> or if target is web:
// do not encode data set CSS variables on element

export function Typography({
  as = 'span',
  variant,
  className,
  style,
  children,
  ...contentOptions
}: TypographyProps) {
  return (
    <InternalElement
      disableInDocumentAssert
      tagName={as}
      elementType="htmltag"
      variant={variant}
      className={className}
      style={style}
      elementOptions={{}}
      typography={contentOptions}
    >
      {children}
    </InternalElement>
  );
}
