import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UnitsSize } from '../entities';
import { InternalElement } from './InternalElement';

const GridContext = createContext<
  undefined | Pick<GridProps, 'gap' | 'columnsCount'>
>(undefined);

export type GridProps = {
  gap: UnitsSize;
  columnsCount?: number;
  children?: ReactNode;
};

const DEFAULT_COLUMNS_COUNT = 12;

const calculateItemWidth = (
  { columnsCount, gap }: Pick<GridProps, 'gap' | 'columnsCount'>,
  size: number,
) => {
  const itemsWidth = `(100% - ((${columnsCount} - 1) * ${gap}))`;
  return `calc(${itemsWidth} * ${size} / ${columnsCount} + (${size} - 1) * ${gap})`;
};

export function Grid({
  gap,
  columnsCount = DEFAULT_COLUMNS_COUNT,
  children,
}: GridProps) {
  return (
    <GridContext.Provider
      value={useMemo(() => ({ gap, columnsCount }), [columnsCount, gap])}
    >
      <InternalElement
        tagName="div"
        elementType="gridContainer"
        elementOptions={{ gap, columnsCount }}
        style={{
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          gap: `0 ${gap}`,
        }}
      >
        {children}
      </InternalElement>
    </GridContext.Provider>
  );
}

export type GridItemProps = {
  size: number;
  children?: ReactNode;
};

export function GridItem({ size, children }: GridItemProps) {
  const contextValue = useContext(GridContext);
  if (!contextValue) {
    throw new Error(`GridItem must be a child of Grid`);
  }
  return (
    <InternalElement
      tagName="div"
      elementType="gridItem"
      elementOptions={{ size }}
      style={{
        flex: `0 0 ${calculateItemWidth(contextValue, size)}`,
      }}
    >
      {children}
    </InternalElement>
  );
}
