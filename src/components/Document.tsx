import { type ReactNode } from 'react';
import { encodeElementData, assignDocumentOptions } from '../entities';
import { type DocumentOptions } from '../entities/options.js';

export type DocumentProps = DocumentOptions & {
  className?: string;
  children: ReactNode;
};

export function Document({
  children,
  className,
  ...elementOptions
}: DocumentProps) {
  return (
    <main
      className={className}
      {...encodeElementData({
        elementType: 'document',
        elementOptions: assignDocumentOptions(elementOptions),
      })}
    >
      {children}
    </main>
  );
}
