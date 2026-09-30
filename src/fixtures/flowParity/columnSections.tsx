import { Stack } from '../../reactComponents';
import { VISUAL_PARAGRAPHS } from '../visualDocuments/visualText';
import { MARGIN, P } from './shared';

/** Line counts around one column height (35 lines) and its multiples. */
const COLUMN_CASES = [
  1, 2, 3, 7, 69, 70, 71, 72, 73, 75, 90, 141, 142, 143, 150,
];

const COLUMNS = { columnCount: 2, columnGap: '0.5in' } as const;

/**
 * Each case is a heading page followed by a continuous two-column section of
 * that many lines. A run of prose in columns and a closing page follow.
 */
export function ColumnSections() {
  return (
    <>
      {COLUMN_CASES.flatMap((count) => [
        <Stack key={`heading-${count}`} margin={MARGIN}>
          <P lineHeight="18pt">{`Case ${count}`}</P>
        </Stack>,
        <Stack
          key={`columns-${count}`}
          margin={MARGIN}
          continuous
          columns={COLUMNS}
        >
          {Array.from({ length: count }, (_, index) => (
            <P key={index} lineHeight="18pt">
              {`C${count} L${String(index + 1).padStart(3, '0')}`}
            </P>
          ))}
        </Stack>,
      ])}
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">Case prose</P>
      </Stack>
      <Stack margin={MARGIN} continuous columns={COLUMNS}>
        {[0, 1, 2].flatMap((round) =>
          VISUAL_PARAGRAPHS.map((text, index) => (
            <P key={`${round}-${index}`} lineHeight="18pt" marginTop="6pt">
              {`[${round}.${index}] ${text}`}
            </P>
          )),
        )}
      </Stack>
      <Stack margin={MARGIN}>
        <P lineHeight="18pt">END</P>
      </Stack>
    </>
  );
}
