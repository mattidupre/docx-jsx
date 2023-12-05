import { type ReactNode } from 'react';
import { type ContentOptions, encodeElementData } from '../entities/elements';

export type TextRunProps = ContentOptions & {
  children: ReactNode;
};

export function TextRun({ children, ...elementOptions }: TextRunProps) {
  return (
    <span
      {...encodeElementData({
        elementType: 'htmltag',
        elementOptions,
      })}
    >
      {children}
    </span>
  );
}
