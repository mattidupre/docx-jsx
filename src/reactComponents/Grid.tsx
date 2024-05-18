import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UnitsSize } from '../entities';
import { InternalElement } from './InternalElement';

const GridContext = createContext<
  undefined | Pick<GridProps, 'gap' | 'columnsCount' | 'pageBreakAvoid'>
>(undefined);

export type GridProps = {
  gap: UnitsSize;
  columnsCount?: number;
  pageBreakAvoid?: boolean;
  children?: ReactNode;
};

const DEFAULT_COLUMNS_COUNT = 12;

const calculateItemWidth = (
  { columnsCount, gap }: Pick<GridProps, 'gap' | 'columnsCount'>,
  size: number,
) => {
  const containerMargins = 1;
  const itemsWidth = `(100% - ((${columnsCount} - 1 + ${containerMargins}) * ${gap}))`;
  return `calc(${itemsWidth} * ${size} / ${columnsCount} + (${size} - 1) * ${gap})`;
};

export function Grid({
  gap,
  columnsCount = DEFAULT_COLUMNS_COUNT,
  pageBreakAvoid = false,
  children,
}: GridProps) {
  return (
    <GridContext.Provider
      value={useMemo(
        () => ({ gap, columnsCount, pageBreakAvoid }),
        [columnsCount, gap, pageBreakAvoid],
      )}
    >
      <InternalElement
        tagName="div"
        elementType="gridContainer"
        elementOptions={{ gap, columnsCount }}
        style={{
          // page-break-avoid CSS will not work with flex.
          position: 'relative', // page-break-avoid fix
          width: `calc(100% + ${gap})`,
          marginLeft: `calc(-1 * (${gap} / 2))`,
          marginRight: `calc(-1 * (${gap} / 2))`,
          overflow: 'auto',
          ...(pageBreakAvoid && {
            pageBreakInside: 'avoid',
            position: 'relative',
          }),
        }}
        typography={{
          ...(pageBreakAvoid && {
            breakInside: 'avoid',
          }),
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
        position: 'relative', // page-break-avoid fix
        display: 'block',
        float: 'left',
        boxSizing: 'border-box',
        width: calculateItemWidth(contextValue, size),
        marginLeft: `calc(${contextValue.gap} / 2)`,
        marginRight: `calc(${contextValue.gap} / 2)`,
      }}
    >
      {children}
    </InternalElement>
  );
}
