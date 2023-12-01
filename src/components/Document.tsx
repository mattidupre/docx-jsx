import { type ReactNode } from 'react';
import {
  encodeElementData,
  type DocumentOptions,
} from '../entities/elements.js';

export type DocumentProps = DocumentOptions<false> & { children: ReactNode };

export function Document({ children, ...elementOptions }: DocumentProps) {
  return (
    <main
      {...encodeElementData({
        elementType: 'document',
        elementOptions,
      })}
    >
      {children}
    </main>
  );
}
