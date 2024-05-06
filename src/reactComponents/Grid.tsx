import type { ReactNode } from 'react';
import type { UnitsSize } from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';

export type GridProps = ExtendableProps & {
  gap: UnitsSize;
  columnsCount?: number;
  children: ReactNode;
};

const DEFAULT_COLUMNS_COUNT = 12;

export function Grid({
  gap,
  columnsCount = DEFAULT_COLUMNS_COUNT,
  children,
  ...props
}: GridProps) {
  return (
    <InternalElement
      tagName="div"
      elementType="gridContainer"
      elementOptions={{ gap, columnsCount }}
      {...props}
    >
      {children}
    </InternalElement>
  );
}

export type GridItemSize = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type GridItemProps = ExtendableProps & {
  size: GridItemSize;
  children: ReactNode;
};

Grid.Item = function GridItem({ size, children, ...props }: GridItemProps) {
  return (
    <InternalElement
      tagName="div"
      elementType="gridItem"
      elementOptions={{ size }}
      {...props}
    >
      {children}
    </InternalElement>
  );
};
