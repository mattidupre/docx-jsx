import { describe, expect, it } from 'vitest';
import { reactToHtml } from '../lib/reactToHtml';
import { DocumentProvider } from './DocumentProvider';
import { Grid, GridItem } from './Grid';
import { Stack } from './Stack';

/**
 * Every `width:calc(…)` in the rendered markup that divides by a column count,
 * which is what a grid item is styled with. The grid container's own
 * `calc(100% + gap)` has no division in it.
 */
const itemWidths = (grid: JSX.Element): ReadonlyArray<string> =>
  Array.from(
    reactToHtml(
      () => (
        <DocumentProvider>
          <Stack>{grid}</Stack>
        </DocumentProvider>
      ),
      'web',
    ).matchAll(/width:calc\((.*?)\)(?=;|")/g),
  )
    .map(([, width]) => width)
    .filter((width) => width.includes(' / '));

describe('GridItem width', () => {
  it('divides the row by the column count of its grid', () => {
    const [full, half] = itemWidths(
      <Grid columnGap="1in" columnCount={4}>
        <GridItem size={4}>
          <p>Full</p>
        </GridItem>
        <GridItem size={2}>
          <p>Half</p>
        </GridItem>
      </Grid>,
    );

    expect(full).toBe('(100% - ((4 - 1 + 1) * 1in)) * 4 / 4 + (4 - 1) * 1in');
    expect(half).toBe('(100% - ((4 - 1 + 1) * 1in)) * 2 / 4 + (2 - 1) * 1in');
  });

  it('gives an item wider than its grid the width of a full row', () => {
    const [oversized, full] = itemWidths(
      <Grid columnGap="1in" columnCount={4}>
        <GridItem size={6}>
          <p>Oversized</p>
        </GridItem>
        <GridItem size={4}>
          <p>Full</p>
        </GridItem>
      </Grid>,
    );

    // The DOCX target gives the same item a row of its own; overflowing the
    // grid in one target only would be a different document.
    expect(oversized).toBe(full);
  });
});
