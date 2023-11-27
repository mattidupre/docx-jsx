import { type ReactNode } from 'react';
import { dataToHtmlAttributes } from '../entities/tree.js';
import { type TextOptions } from '../entities/elements';

export type ParagraphProps = TextOptions & {
  children: ReactNode;
};

export function TextRun({ children, ...options }: ParagraphProps) {
  return (
    <span {...dataToHtmlAttributes({ elementType: 'textrun', options })}>
      {children}
    </span>
  );
}
