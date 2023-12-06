import { type ReactNode } from 'react';
import { encodeElementData, type TextOptions } from '../entities';

export type TextRunProps = {
  text?: TextOptions;
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
