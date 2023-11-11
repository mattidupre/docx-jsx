import { type ReactNode } from 'react';
import { elementDataToAttributes } from 'src/entities/tree';

export type ParagraphProps = {
  children: ReactNode;
};

export function TextRun({ children }: ParagraphProps) {
  return <span {...elementDataToAttributes('textrun', {})}>{children}</span>;
}
