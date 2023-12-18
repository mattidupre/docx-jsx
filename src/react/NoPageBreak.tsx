import type { ReactNode } from 'react';
import { InternalElement } from './InternalElement';

type NoPageBreakProps = {
  children: ReactNode;
};

export function NoPageBreak({ children }: NoPageBreakProps) {
  return (
    <InternalElement
      elementType="htmltag"
      elementOptions={{}}
      contentOptions={{ breakInside: 'avoid' }}
      tagName="div"
    >
      {children}
    </InternalElement>
  );
}
