import type { ReactNode } from 'react';
import type {
  TagName,
  ContentTextOptions,
  ContentParagraphOptions,
  VariantName,
} from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities.js';

export type TypographyProps = ExtendableProps &
  (
    | ({
        as?: 'span';
      } & ContentTextOptions)
    | ({
        as: Exclude<TagName, 'span'>;
      } & ContentTextOptions &
        ContentParagraphOptions)
  ) & { variant?: VariantName; children: ReactNode };

// TODO: If not within a <Document> or if target is web: do not encode data set
// CSS variables on element

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
      tagName={as}
      elementType="htmltag"
      variant={variant}
      className={className}
      style={style}
      elementOptions={{}}
      contentOptions={contentOptions}
    >
      {children}
    </InternalElement>
  );
}
