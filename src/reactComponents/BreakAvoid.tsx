import type { ReactNode } from 'react';
import { InternalElement } from './InternalElement';

type BreakAvoidProps = {
  after?: boolean;
  children: ReactNode;
};

// TODO: Accept class name

export function BreakAvoid({ after, children }: BreakAvoidProps) {
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
