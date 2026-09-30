import type { ReactNode } from 'react';
import { DocumentProvider, Stack } from '../../reactComponents';
import { runningLayouts } from './runningLayouts';
import { VISUAL_PARAGRAPHS } from './visualText';

const Prose = ({ from = 0 }: { from?: number }): ReactNode =>
  VISUAL_PARAGRAPHS.slice(from).map((paragraph, index) => (
    <p key={`prose_${from}_${index}`}>{paragraph}</p>
  ));

/**
 * Multi-column stacks with running headers and footers. This is the fixture
 * that exercises page counters (`PageNumber` / `PageCount`), the first versus
 * subsequent page layouts, and column balancing across a page break.
 */
export function ColumnsDocument() {
  return (
    <DocumentProvider>
      <Stack layouts={runningLayouts('COLUMNS')}>
        <h1>Two columns</h1>
      </Stack>
      <Stack
        continuous
        columns={{ columnCount: 2, columnGap: '0.5in' }}
        layouts={runningLayouts('TWO COLUMN')}
      >
        <Prose />
        <Prose from={2} />
      </Stack>
      <Stack layouts={runningLayouts('THREE COLUMN HEAD')}>
        <h1>Three columns</h1>
      </Stack>
      <Stack
        continuous
        columns={{ columnCount: 3, columnGap: '0.375in' }}
        layouts={runningLayouts('THREE COLUMN')}
      >
        <Prose />
        <Prose from={3} />
      </Stack>
    </DocumentProvider>
  );
}
