import { type ReactNode } from 'react';
import { dataToHtmlAttributes } from '../entities/tree.js';

// Emulate https://chakra-ui.com/docs/components/text

export type TypographyProps = {
  children: ReactNode;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  bold?: boolean;
};

export function Typography({ as = 'span', children }: TypographyProps) {
  return (
    <span {...dataToHtmlAttributes({ elementType: 'textrun', options: {} })}>
      {children}
    </span>
  );
}
