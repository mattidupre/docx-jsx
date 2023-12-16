import { type ReactNode, createElement } from 'react';
import {
  encodeElementData,
  type TagName,
  type TextOptions,
  type ParagraphOptions,
} from '../entities';

export type TypographyOptions = {
  text?: TextOptions;
  paragraph?: ParagraphOptions;
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
) & {
  className?: string;
  children: ReactNode;
};

// TODO: If not within a <Document> or if target is web: do not encode data set
// CSS variables on element

export function Typography({
  as = 'span',
  className,
  children,
  ...options
}: TypographyProps) {
  return createElement(
    as,
    {
      ...encodeElementData({
        elementType: 'htmltag',
        elementOptions: options,
      }),
      className,
    },
    children,
  );
}
