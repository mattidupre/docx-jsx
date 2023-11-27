import { type ReactNode } from 'react';
import { dataToHtmlAttributes } from '../entities/tree.js';
import { type ParagraphOptions } from '../entities/elements.js';

export type ParagraphProps = ParagraphOptions & {
  children: ReactNode;
};

export function Paragraph({ children, ...options }: ParagraphProps) {
  return (
    <p {...dataToHtmlAttributes({ elementType: 'paragraph', options })}>
      {children}
    </p>
  );
}
