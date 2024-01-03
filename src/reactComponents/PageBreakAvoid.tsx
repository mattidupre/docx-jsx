import type { ReactNode } from 'react';
import { InternalElement } from './InternalElement';

type NoPageBreakProps = {
  children: ReactNode;
};

export function PageBreakAvoid({ children }: NoPageBreakProps) {
  return (
    <InternalElement
      elementType="htmltag"
      elementOptions={{}}
      typography={{ breakInside: 'avoid' }}
      tagName="div"
    >
      {children}
    </InternalElement>
  );
}
