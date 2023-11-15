import { type ReactNode } from 'react';
import { dataToHtmlAttributes } from 'src/entities/tree';

export type ParagraphProps = {
  children: ReactNode;
};

export function TextRun({ children }: ParagraphProps) {
  return (
    <span {...dataToHtmlAttributes({ elementType: 'textrun', options: {} })}>
      {children}
    </span>
  );
}
