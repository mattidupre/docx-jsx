import { type ReactNode } from 'react';
import { dataToHtmlAttributes } from '../entities/tree.js';

export type ParagraphProps = {
  children: ReactNode;
};

export function Paragraph({ children }: ParagraphProps) {
  return (
    <p {...dataToHtmlAttributes({ elementType: 'paragraph', options: {} })}>
      {children}
    </p>
  );
}
