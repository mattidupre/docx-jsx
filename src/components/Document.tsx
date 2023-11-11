import { type ReactNode } from 'react';
import { elementDataToAttributes } from 'src/entities/tree';
import { PageSize } from 'src/entities/options';

export type DocumentProps = { pageSize: PageSize; children: ReactNode };

export function Document({ children, ...options }: DocumentProps) {
  return (
    <main {...elementDataToAttributes('document', options)}>{children}</main>
  );
}
