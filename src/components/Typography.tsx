import { type ReactNode, createElement } from 'react';
import { encodeElementData } from '../entities';

// Emulate https://chakra-ui.com/docs/components/text

export type TypographyProps = {
  children: ReactNode;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
};

export function Typography({ as = 'span', children }: TypographyProps) {
  return createElement(
    as,
    encodeElementData({
      elementType: 'htmltag',
      elementOptions: {},
    }),
    children,
  );
}
