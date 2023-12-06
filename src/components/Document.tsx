import { type ReactNode } from 'react';
import { encodeElementData, assignDocumentOptions } from '../entities';
import { type DocumentOptions } from 'src/entities/options.js';

export type DocumentProps = DocumentOptions & { children: ReactNode };

export function Document({ children, ...elementOptions }: DocumentProps) {
  return (
    <main
      {...encodeElementData({
        elementType: 'document',
        elementOptions: assignDocumentOptions(elementOptions),
      })}
    >
      {children}
    </main>
  );
}
