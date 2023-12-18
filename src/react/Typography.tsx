import { type ReactNode, useMemo } from 'react';
import type {
  TagName,
  ContentTextOptions,
  ContentParagraphOptions,
  VariantName,
} from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities.js';

export type TypographyOptions = {
  text?: ContentTextOptions;
  paragraph?: ContentParagraphOptions;
};

export type TypographyProps = (
  | {
      as?: 'span';
      text?: TypographyOptions['text'];
      paragraph?: never;
    }
  | {
      as: Exclude<TagName, 'span'>;
      text?: TypographyOptions['text'];
      paragraph?: TypographyOptions['paragraph'];
    }
) &
  ExtendableProps & { variant?: VariantName; children: ReactNode };

// TODO: If not within a <Document> or if target is web: do not encode data set
// CSS variables on element

export function Typography({
  as = 'span',
  text,
  paragraph,
  variant,
  children,
  ...props
}: TypographyProps) {
  const elementOptions = useMemo(
    () => ({ text, paragraph, variant }),
    [paragraph, text, variant],
  );
  return (
    <InternalElement
      tagName={as}
      elementType="htmltag"
      elementOptions={elementOptions}
      {...props}
    >
      {children}
    </InternalElement>
  );
}
