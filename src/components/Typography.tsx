import { type ReactNode, createElement } from 'react';
import {
  encodeElementData,
  type TagName,
  type TextOptions,
  type ParagraphOptions,
} from '../entities';

// Emulate https://chakra-ui.com/docs/components/text

export type TypographyProps = (
  | {
      as?: 'span';
      text?: TextOptions;
      paragraph?: never;
    }
  | {
      as: Exclude<TagName, 'span'>;
      text?: TextOptions;
      paragraph?: ParagraphOptions;
    }
) & {
  className?: string;
  children: ReactNode;
};

// TODO: If not within a <Document> or if target is web:
// do not encode data
// set CSS variables on element

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
