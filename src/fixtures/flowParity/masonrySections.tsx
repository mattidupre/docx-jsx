import { MasonryGroup, Stack, Typography } from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from '../visualDocuments/visualText';
import { MARGIN, P } from './shared';

const MASONRY_COLUMNS = {
  columnCount: 2,
  columnGap: '0.5in',
  fill: 'masonry',
} as const;

/**
 * The paragraphs of each group, as indexes into the prose. Their heights vary
 * with the text, so the packing reorders them, and the tall group splits
 * across columns and onto the next page.
 */
const GROUPS: ReadonlyArray<ReadonlyArray<number>> = [
  [0],
  [1, 2, 3],
  [4],
  [5, 6],
  [7, 8, 9, 10],
  [11],
  [12, 13],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  [14],
  [2, 9],
  [6],
  [3, 4, 5],
  [10],
  [13],
];

const prose = (index: number) =>
  VISUAL_PARAGRAPHS[index % VISUAL_PARAGRAPHS.length];

/**
 * M1-M14: masonry groups of varied height, packed into the shortest column.
 * Each group is labelled so the packed order can be read off both renders;
 * M8 is taller than a column and splits, and a heading keeps with M10.
 */
export function MasonrySections() {
  return (
    <>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">Case masonry</P>
      </Stack>
      <Stack margin={MARGIN} continuous columns={MASONRY_COLUMNS}>
        {GROUPS.flatMap((paragraphs, group) => [
          ...(group === 9
            ? [
                <MasonryGroup key="heading" keepWithNext>
                  <Typography as="h2" fontFamily="Arial" lineHeight="24pt">
                    M10 heading
                  </Typography>
                </MasonryGroup>,
              ]
            : []),
          <MasonryGroup key={group}>
            {paragraphs.map((paragraph, index) => (
              <P key={index} lineHeight="18pt" marginTop="6pt">
                {`[M${group + 1}.${index + 1}] ${prose(paragraph)}`}
              </P>
            ))}
          </MasonryGroup>,
        ])}
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">END masonry</P>
      </Stack>
    </>
  );
}
