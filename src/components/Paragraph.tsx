import { type ReactNode } from 'react';
import { elementDataToAttributes } from 'src/entities/elements';

export type ParagraphProps = {
  children: ReactNode;
};

export function Paragraph({ children }: ParagraphProps) {
  return <p {...elementDataToAttributes('paragraph', {})}>{children}</p>;
}
