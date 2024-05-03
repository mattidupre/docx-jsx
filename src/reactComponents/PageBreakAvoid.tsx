import type { ReactNode } from 'react';
import { InternalElement } from './InternalElement';

type NoPageBreakProps = {
  after?: boolean;
  children: ReactNode;
};

// TODO: Accept class name

export function PageBreakAvoid({ after, children }: NoPageBreakProps) {
  return (
    <InternalElement
      elementType="htmltag"
      elementOptions={{}}
      typography={{
        breakInside: 'avoid',
        breakAfter: after ? 'avoid' : undefined,
      }}
      tagName="div"
    >
      {children}
    </InternalElement>
  );
}
