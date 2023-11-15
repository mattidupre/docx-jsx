import { type ReactNode } from 'react';
import { dataToHtmlAttributes } from 'src/entities/tree';
import { DocumentOptions } from 'src/entities/elements';

export type DocumentProps = DocumentOptions<false> & { children: ReactNode };

export function Document({ children, size }: DocumentProps) {
  return (
    <main
      {...dataToHtmlAttributes({ elementType: 'document', options: { size } })}
    >
      {children}
    </main>
  );
}
