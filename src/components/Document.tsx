import { type ReactNode } from 'react';
import { dataToHtmlAttributes } from '../entities/tree.js';
import { DocumentOptions } from '../entities/elements.js';

export type DocumentProps = DocumentOptions<false> & { children: ReactNode };

export function Document({ children, ...options }: DocumentProps) {
  return (
    <main
      {...dataToHtmlAttributes({
        elementType: 'document',
        options,
      })}
    >
      {children}
    </main>
  );
}
