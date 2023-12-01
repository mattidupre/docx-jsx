import { type ReactNode } from 'react';
import {
  encodeElementData,
  type ParagraphOptions,
} from '../entities/elements.js';

export type ParagraphProps = ParagraphOptions & {
  children: ReactNode;
};

export function Paragraph({ children, ...elementOptions }: ParagraphProps) {
  return (
    <p
      {...encodeElementData({
        elementType: 'paragraph',
        elementOptions,
      })}
    >
      {children}
    </p>
  );
}
