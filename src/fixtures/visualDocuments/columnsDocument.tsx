import type { ReactNode } from 'react';
import {
  DocumentProvider,
  IfEnvironment,
  PageCount,
  PageNumber,
  Stack,
  Typography,
} from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from './visualText';

const PageCounter = () => (
  <IfEnvironment not documentType="web">
    <span>
      Page <PageNumber /> of <PageCount />
    </span>
  </IfEnvironment>
);

/**
 * Each layout element must be a distinct node, so the layouts are built by a
 * factory rather than by reusing one element in both slots.
 */
const runningLayouts = (prefix: string) => ({
  first: {
    header: (
      <Typography as="p">
        {prefix} / FIRST / <PageCounter />
      </Typography>
    ),
    footer: (
      <Typography as="p">
        {prefix} / FIRST FOOTER / <PageCounter />
      </Typography>
    ),
  },
  subsequent: {
    header: (
      <Typography as="p">
        {prefix} / DEFAULT / <PageCounter />
      </Typography>
    ),
    footer: (
      <Typography as="p">
        {prefix} / DEFAULT FOOTER / <PageCounter />
      </Typography>
    ),
  },
});

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
