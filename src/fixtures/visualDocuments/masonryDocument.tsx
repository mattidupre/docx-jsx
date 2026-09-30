import type { ReactNode } from 'react';
import {
  DocumentProvider,
  MasonryGroup,
  Stack,
  Typography,
} from '../../reactComponents';
import { runningLayouts } from './runningLayouts';
import { VISUAL_PARAGRAPHS } from './visualText';

type UnitSize = 'line' | 'short' | 'medium' | 'long' | 'tall';

/**
 * How many whole paragraphs a unit of each size holds after its label. A short
 * unit holds only the first sentence of one, and a line only its label.
 */
const UNIT_PARAGRAPH_COUNT: Readonly<Record<UnitSize, number>> = {
  line: 0,
  short: 0,
  medium: 1,
  long: 2,
  tall: 3,
};

/** Space after every paragraph, so the units read as separate blocks. */
const UNIT_GAP = '12px';

const paragraph = (index: number) =>
  VISUAL_PARAGRAPHS[index % VISUAL_PARAGRAPHS.length];

const Unit = ({
  label,
  size,
  from,
}: {
  label: string;
  size: UnitSize;
  from: number;
}): ReactNode => (
  <MasonryGroup>
    <Typography as="p" marginBottom={UNIT_GAP}>
      <Typography fontWeight="bold">{label}</Typography>
      {size === 'short' ? ` ${paragraph(from).split('. ')[0]}.` : ''}
    </Typography>
    {Array.from({ length: UNIT_PARAGRAPH_COUNT[size] }, (_, offset) => (
      <Typography key={offset} as="p" marginBottom={UNIT_GAP}>
        {paragraph(from + offset)}
      </Typography>
    ))}
  </MasonryGroup>
);

/**
 * A masonry stack of units of clearly different heights. Each unit is packed
 * whole into the column that ends highest; when the next unit fits neither
 * column the packer looks ahead for a shorter one that does, so the labels
 * read out of order down the columns. The heading unit keeps with the unit
 * after it. The last page holds the rest of the units, which are balanced
 * across its columns instead of filling the left one first.
 */
export function MasonryDocument() {
  return (
    <DocumentProvider>
      <Stack layouts={runningLayouts('MASONRY')}>
        <h1>Masonry columns</h1>
      </Stack>
      <Stack
        continuous
        columns={{ columnCount: 2, columnGap: '0.5in', fill: 'masonry' }}
        layouts={runningLayouts('MASONRY COLUMNS')}
      >
        <Unit label="U01 tall" size="tall" from={0} />
        <Unit label="U02 medium" size="medium" from={1} />
        <Unit label="U03 short" size="short" from={2} />
        <Unit label="U04 long" size="long" from={3} />
        <MasonryGroup keepWithNext>
          <Typography as="h2" marginTop="0px" marginBottom={UNIT_GAP}>
            U05 heading
          </Typography>
        </MasonryGroup>
        <Unit label="U06 long" size="long" from={4} />
        <Unit label="U07 line" size="line" from={5} />
        <Unit label="U08 tall" size="tall" from={1} />
        <Unit label="U09 medium" size="medium" from={2} />
        <Unit label="U10 short" size="short" from={3} />
        <Unit label="U11 medium" size="medium" from={4} />
        <Unit label="U12 long" size="long" from={5} />
        <Unit label="U13 short" size="short" from={0} />
        <Unit label="U14 medium" size="medium" from={3} />
        <Unit label="U15 line" size="line" from={1} />
        <Unit label="U16 long" size="long" from={2} />
        <Unit label="U17 short" size="short" from={4} />
        <MasonryGroup keepWithNext>
          <Typography as="h2" marginTop="0px" marginBottom={UNIT_GAP}>
            U18 heading
          </Typography>
        </MasonryGroup>
        <Unit label="U19 medium" size="medium" from={5} />
        <Unit label="U20 tall" size="tall" from={2} />
        <Unit label="U21 short" size="short" from={1} />
        <Unit label="U22 medium" size="medium" from={0} />
        <Unit label="U23 line" size="line" from={3} />
      </Stack>
    </DocumentProvider>
  );
}
