import type { ReactNode } from 'react';
import { InternalElement } from './InternalElement';

export type MasonryGroupProps = {
  className?: string;
  /**
   * Keep the group in the same column as the unit after it, as a heading
   * keeps with its paragraph. The two are packed as one.
   */
  keepWithNext?: boolean;
  children: ReactNode;
};

/**
 * One unit of a `Stack` with `columns={{ ..., fill: 'masonry' }}`: its content
 * moves as a whole to the shortest column, and splits only when it is taller
 * than a column. Every other direct child of a masonry stack is a unit of its
 * own, so a group is how several blocks move together. It must be a direct
 * child of a stack; in a stack whose columns flow it is a plain block.
 */
export function MasonryGroup({
  className,
  keepWithNext,
  children,
}: MasonryGroupProps) {
  return (
    <InternalElement
      elementType="masonryGroup"
      elementOptions={{}}
      className={className}
      typography={keepWithNext ? { breakAfter: 'avoid' } : undefined}
      tagName="div"
    >
      {children}
    </InternalElement>
  );
}
