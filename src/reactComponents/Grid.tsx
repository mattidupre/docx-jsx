import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UnitsSize } from '../entities';
import { InternalElement } from './InternalElement';

const GridContext = createContext<
  undefined | Pick<GridProps, 'columnGap' | 'columnCount' | 'pageBreakAvoid'>
>(undefined);

export type GridProps = {
  columnGap: UnitsSize;
  columnCount?: number;
  pageBreakAvoid?: boolean;
  children?: ReactNode;
};

const DEFAULT_COLUMNS_COUNT = 12;

/**
 * An item spans whole columns of the row it sits in, so a size outside
 * `1..columnCount` has no row to describe. It is clamped rather than rejected,
 * which is what the DOCX target does with the same value: a wider item takes a
 * row of its own instead of overflowing the grid in one target and throwing in
 * the other.
 */
const clampItemSize = (size: number, columnCount: number) =>
  Math.min(Math.max(Math.round(size), 1), columnCount);

const calculateItemWidth = (
  {
    columnGap,
    columnCount = DEFAULT_COLUMNS_COUNT,
  }: Pick<GridProps, 'columnGap' | 'columnCount'>,
  sizeProp: number,
) => {
  const size = clampItemSize(sizeProp, columnCount);
  const containerMargins = 1;
  const itemsWidth = `(100% - ((${columnCount} - 1 + ${containerMargins}) * ${columnGap}))`;
  return `calc(${itemsWidth} * ${size} / ${columnCount} + (${size} - 1) * ${columnGap})`;
};

export function Grid({
  columnGap,
  columnCount = DEFAULT_COLUMNS_COUNT,
  pageBreakAvoid = false,
  children,
}: GridProps) {
  return (
    <GridContext.Provider
      value={useMemo(
        () => ({ columnGap, columnCount, pageBreakAvoid }),
        [columnCount, columnGap, pageBreakAvoid],
      )}
    >
      <InternalElement
        tagName="div"
        elementType="gridContainer"
        elementOptions={{ columnGap, columnCount }}
        style={{
          // page-break-avoid CSS will not work with flex.
          position: 'relative', // page-break-avoid fix
          width: `calc(100% + ${columnGap})`,
          marginLeft: `calc(-1 * (${columnGap} / 2))`,
          marginRight: `calc(-1 * (${columnGap} / 2))`,
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
        marginLeft: `calc(${contextValue.columnGap} / 2)`,
        marginRight: `calc(${contextValue.columnGap} / 2)`,
      }}
    >
      {children}
    </InternalElement>
  );
}
