import { type ReactNode, createElement } from 'react';
import {
  encodeElementData,
  type TextOptions,
  type ParagraphOptions,
} from '../entities';

// Emulate https://chakra-ui.com/docs/components/text

export type TypographyProps = (
  | {
      as: 'span';
      text?: never;
      paragraph: ParagraphOptions;
    }
  | {
      as: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      text?: TextOptions;
      paragraph?: ParagraphOptions;
    }
) & {
  children: ReactNode;
};

export function Typography({
  as = 'span',
  children,
  ...options
}: TypographyProps) {
  return createElement(
    as,
    encodeElementData({
      elementType: 'htmltag',
      elementOptions: options,
    }),
    children,
  );
}
