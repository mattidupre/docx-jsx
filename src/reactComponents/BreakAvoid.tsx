import type { ReactNode } from 'react';
import { InternalElement } from './InternalElement';

type BreakAvoidProps = {
  className?: string;
  after?: boolean;
  children: ReactNode;
};

// TODO: Accept class name

export function BreakAvoid({ className, after, children }: BreakAvoidProps) {
  return (
    <InternalElement
      elementType="htmltag"
      elementOptions={{}}
      className={className}
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
