import { type ReactNode } from 'react';
import { encodeElementData } from '../entities';
import { type ParagraphOptions } from 'src/entities/options.js';

export type ParagraphProps = ParagraphOptions & {
  children: ReactNode;
};

export function Paragraph({ children, ...elementOptions }: ParagraphProps) {
  return (
    <p
      {...encodeElementData({
        elementType: 'htmltag',
        elementOptions,
      })}
    >
      {children}
    </p>
  );
}
