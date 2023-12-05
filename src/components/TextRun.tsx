import { type ReactNode } from 'react';
import { encodeElementData, type ContentOptions } from '../entities';

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
